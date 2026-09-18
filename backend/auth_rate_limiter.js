// Dedicated Authentication Rate Limiter (Brute-Force & Credential Stuffing Defense)
// Enforces max 5 failed attempts per 15 minutes per IP and per target identifier (email)

const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

// In-memory sliding window store
// Map<key, { count: number, resetAt: number, lockedUntil: number }>
const authAttemptStore = new Map();

function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const headers = req.headers || {};
  return (
    headers['x-forwarded-for']?.split(',')[0].trim() ||
    headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

function normalizeIdentifier(email) {
  return (email || '').trim().toLowerCase();
}

function checkRateLimit(key, limit = MAX_FAILED_ATTEMPTS, windowMs = RATE_WINDOW_MS) {
  const now = Date.now();
  const entry = authAttemptStore.get(key) || { count: 0, resetAt: now + windowMs, lockedUntil: 0 };

  // If locked
  if (entry.lockedUntil > now) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfter
    };
  }

  // If window expired, reset
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
    entry.lockedUntil = 0;
  }

  if (entry.count >= limit) {
    entry.lockedUntil = now + windowMs;
    authAttemptStore.set(key, entry);
    const retryAfter = Math.ceil(windowMs / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfter
    };
  }

  return {
    allowed: true,
    remaining: limit - entry.count,
    retryAfterSeconds: 0
  };
}

function recordFailedAttempt(key, windowMs = RATE_WINDOW_MS) {
  const now = Date.now();
  const entry = authAttemptStore.get(key) || { count: 0, resetAt: now + windowMs, lockedUntil: 0 };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count++;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + windowMs;
  }
  authAttemptStore.set(key, entry);
  return entry;
}

function clearAttempts(key) {
  authAttemptStore.delete(key);
}

/**
 * Check if request is allowed for IP and email.
 */
function checkAuthRateLimit(req, email = null) {
  const ip = getClientIp(req);
  const ipKey = `auth_ip:${ip}`;
  const ipResult = checkRateLimit(ipKey, 20); // IP-wide threshold: 20 per 15 min

  if (!ipResult.allowed) {
    return ipResult;
  }

  if (email) {
    const idKey = `auth_id:${normalizeIdentifier(email)}`;
    const idResult = checkRateLimit(idKey, MAX_FAILED_ATTEMPTS); // Target threshold: 5 per 15 min
    if (!idResult.allowed) {
      return idResult;
    }
  }

  return { allowed: true, remaining: 5, retryAfterSeconds: 0 };
}

/**
 * Record a failed authentication attempt for both IP and email.
 */
function registerAuthFailure(req, email = null) {
  const ip = getClientIp(req);
  recordFailedAttempt(`auth_ip:${ip}`);
  if (email) {
    recordFailedAttempt(`auth_id:${normalizeIdentifier(email)}`);
  }
}

/**
 * Clear failure counters after successful authentication.
 */
function registerAuthSuccess(req, email = null) {
  const ip = getClientIp(req);
  clearAttempts(`auth_ip:${ip}`);
  if (email) {
    clearAttempts(`auth_id:${normalizeIdentifier(email)}`);
  }
}

/**
 * Reset all rate limits (useful for test runs)
 */
function resetAllLimits() {
  authAttemptStore.clear();
}

module.exports = {
  checkAuthRateLimit,
  registerAuthFailure,
  registerAuthSuccess,
  resetAllLimits,
  getClientIp,
  MAX_FAILED_ATTEMPTS,
  RATE_WINDOW_MS
};
