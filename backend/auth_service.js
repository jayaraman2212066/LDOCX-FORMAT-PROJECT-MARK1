// User Authentication & JWT Session Engine (Hardened with Bcrypt, Session Revocation & Single-Use Tokens)
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'ldoc_jwt_secure_access_secret_2026';
const BCRYPT_SALT_ROUNDS = 12;
const JWT_EXPIRES_IN_SECONDS = 24 * 3600; // 24 hours
const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

/**
 * Hash password with bcrypt (cost factor 12)
 */
function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Verify password with constant-time comparison, supporting backward compatibility with legacy PBKDF2 hashes
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;

  // Modern bcrypt hash
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compareSync(password, storedHash);
  }

  // Legacy PBKDF2 hash (salt:hash)
  const parts = storedHash.split(':');
  if (parts.length === 2) {
    const [salt, origHash] = parts;
    if (!salt || !origHash) return false;
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    try {
      const a = Buffer.from(verifyHash, 'hex');
      const b = Buffer.from(origHash, 'hex');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch (e) {
      return false;
    }
  }

  return false;
}

/**
 * Sign a signed JWT with unique jti and 24-hour expiration
 */
function signToken(payload, expiresInSeconds = JWT_EXPIRES_IN_SECONDS) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const jti = crypto.randomBytes(16).toString('hex');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    jti,
    iat: now,
    exp: now + expiresInSeconds
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/**
 * Verify JWT signature, expiration, and server-side revocation
 */
async function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch (e) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;

    // Check server-side revocation list
    const isRevoked = await db.revoked_tokens.isRevoked(token);
    if (isRevoked) return null;

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Invalidate a token server-side upon logout
 */
async function revokeToken(token) {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      const expiresAt = payload.exp || Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS;
      await db.revoked_tokens.revoke(token, expiresAt);
      return true;
    }
  } catch (e) {}
  await db.revoked_tokens.revoke(token, Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS);
  return true;
}

/**
 * User registration with bcrypt password hashing
 */
async function register({ email, password, name }) {
  if (!email || !email.includes('@')) throw new Error('Valid email required');
  if (!password || password.length < 8) throw new Error('Password must be at least 8 characters');

  const existing = await db.users.findByEmail(email);
  if (existing) {
    // Avoid user enumeration
    throw new Error('Registration could not be completed with this email');
  }

  const password_hash = hashPassword(password);
  const user = await db.users.create({ email, password_hash, name });
  const token = signToken({ id: user.id, email: user.email, plan: user.plan });
  return { ok: true, token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } };
}

/**
 * User login with bcrypt verification and transparent legacy hash upgrade
 */
async function login({ email, password }) {
  if (!email || !password) {
    throw new Error('Invalid email or password');
  }

  const user = await db.users.findByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new Error('Invalid email or password');
  }

  // Transparently upgrade legacy PBKDF2 hash to bcrypt
  if (user.password_hash && !user.password_hash.startsWith('$2')) {
    try {
      const newHash = hashPassword(password);
      await db.users.update(user.id, { password_hash: newHash });
    } catch (e) {}
  }

  const token = signToken({ id: user.id, email: user.email, plan: user.plan });
  return { ok: true, token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } };
}

/**
 * Generate a single-use cryptographically random password reset token (1 hour expiry)
 */
async function createPasswordResetToken(email) {
  if (!email) {
    return { ok: true, message: 'If that email address exists, reset instructions have been sent.' };
  }

  const user = await db.users.findByEmail(email);
  if (!user) {
    // Always return uniform message to prevent user enumeration
    return { ok: true, message: 'If that email address exists, reset instructions have been sent.' };
  }

  // 32-byte secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  // Store only the SHA-256 hash of the token in the database
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS).toISOString();

  await db.users.update(user.id, {
    password_reset_token: tokenHash,
    password_reset_expires: expiresAt
  });

  return {
    ok: true,
    rawToken, // Provided to mailing transport or test harness
    message: 'If that email address exists, reset instructions have been sent.'
  };
}

/**
 * Reset password using a single-use reset token
 */
async function resetPasswordWithToken(rawToken, newPassword) {
  if (!rawToken) {
    throw new Error('Invalid or expired password reset token');
  }
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await db.users.findByResetToken(tokenHash);

  if (!user || !user.password_reset_expires) {
    throw new Error('Invalid or expired password reset token');
  }

  const expiresTime = new Date(user.password_reset_expires).getTime();
  if (Date.now() > expiresTime) {
    // Clear expired token
    await db.users.update(user.id, { password_reset_token: null, password_reset_expires: null });
    throw new Error('Invalid or expired password reset token');
  }

  // Hash new password with bcrypt
  const newHash = hashPassword(newPassword);

  // Single-use: immediately nullify the reset token and expiry
  await db.users.update(user.id, {
    password_hash: newHash,
    password_reset_token: null,
    password_reset_expires: null
  });

  return { ok: true, message: 'Password has been successfully updated' };
}

module.exports = {
  register,
  login,
  verifyToken,
  signToken,
  revokeToken,
  createPasswordResetToken,
  resetPasswordWithToken,
  hashPassword,
  verifyPassword,
  BCRYPT_SALT_ROUNDS,
  JWT_EXPIRES_IN_SECONDS
};
