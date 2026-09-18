// Universal Database Adapter (PostgreSQL / Supabase with Local Zero-Config Fallback)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IS_SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_SERVERLESS ? path.join('/tmp', 'ldoc_data') : path.join(__dirname, 'data');

try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  // Read-only filesystem fallback
}

// In-memory cache fallback for serverless environments
const memStore = {};

function getTablePath(table) { return path.join(DATA_DIR, `${table}.json`); }

function readTable(table) {
  if (memStore[table]) return memStore[table];
  const p = getTablePath(table);
  if (fs.existsSync(p)) {
    try {
      const d = JSON.parse(fs.readFileSync(p, 'utf8') || '[]');
      memStore[table] = d;
      return d;
    } catch (err) {}
  }
  // Fallback to initial seed files if running in /tmp
  const seedP = path.join(__dirname, 'data', `${table}.json`);
  if (fs.existsSync(seedP)) {
    try {
      const d = JSON.parse(fs.readFileSync(seedP, 'utf8') || '[]');
      memStore[table] = d;
      return d;
    } catch (err) {}
  }
  return [];
}

function writeTable(table, rows) {
  memStore[table] = rows;
  try {
    fs.writeFileSync(getTablePath(table), JSON.stringify(rows, null, 2), 'utf8');
  } catch (err) {
    // Graceful fallback on read-only environments
  }
}

function seedTemplatesIfEmpty() {
  const tmpls = readTable('templates');
  if (tmpls.length === 0) {
    try {
      const p = path.join(__dirname, 'data', 'templates.json');
      if (fs.existsSync(p)) {
        writeTable('templates', JSON.parse(fs.readFileSync(p, 'utf8')));
      }
    } catch (e) {}
  }
}
seedTemplatesIfEmpty();

const db = {
  users: {
    async findByEmail(email) {
      return readTable('users').find(u => u.email.toLowerCase() === (email || '').toLowerCase()) || null;
    },
    async findById(id) {
      return readTable('users').find(u => u.id === id) || null;
    },
    async findByResetToken(tokenHash) {
      if (!tokenHash) return null;
      return readTable('users').find(u => u.password_reset_token === tokenHash) || null;
    },
    async update(id, updateData) {
      const rows = readTable('users');
      const idx = rows.findIndex(u => u.id === id);
      if (idx === -1) return null;
      rows[idx] = { ...rows[idx], ...updateData, updated_at: new Date().toISOString() };
      writeTable('users', rows);
      return rows[idx];
    },
    async create(userData) {
      const rows = readTable('users');
      const newUser = {
        id: 'usr_' + crypto.randomBytes(8).toString('hex'),
        email: userData.email.toLowerCase(),
        name: userData.name || userData.email.split('@')[0],
        password_hash: userData.password_hash,
        plan: userData.plan || 'free',
        failed_attempts: 0,
        locked_until: null,
        password_reset_token: null,
        password_reset_expires: null,
        created_at: new Date().toISOString()
      };
      rows.push(newUser);
      writeTable('users', rows);
      return newUser;
    }
  },
  revoked_tokens: {
    async revoke(token, expiresAt) {
      if (!token) return;
      const rows = readTable('revoked_tokens');
      const now = Math.floor(Date.now() / 1000);
      // Clean up expired entries while adding new
      const cleaned = rows.filter(r => (r.expires_at || 0) > now);
      cleaned.push({
        token_hash: crypto.createHash('sha256').update(token).digest('hex'),
        revoked_at: now,
        expires_at: expiresAt || (now + 86400)
      });
      writeTable('revoked_tokens', cleaned);
    },
    async isRevoked(token) {
      if (!token) return true;
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const rows = readTable('revoked_tokens');
      const now = Math.floor(Date.now() / 1000);
      return rows.some(r => r.token_hash === tokenHash && (r.expires_at || 0) > now);
    }
  },
  documents: {
    async listByUser(userId) {
      const rows = readTable('documents');
      if (!userId) return rows.filter(d => d.is_public);
      return rows.filter(d => d.user_id === userId || d.is_public);
    },
    async findById(id) {
      return readTable('documents').find(d => d.id === id) || null;
    },
    async create(docData) {
      const rows = readTable('documents');
      const newDoc = {
        id: docData.id || 'doc_' + crypto.randomBytes(8).toString('hex'),
        user_id: docData.user_id || 'anonymous',
        title: docData.title || 'Untitled Living Document',
        theme: docData.theme || 'dark_gold',
        is_public: docData.is_public ?? true,
        ast: docData.ast || { schema_version: '2.5.0', title: docData.title, pages: [] },
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      rows.push(newDoc);
      writeTable('documents', rows);

      await db.document_versions.create({
        document_id: newDoc.id,
        version_num: 1,
        ast: newDoc.ast,
        summary: 'Initial Creation'
      });
      return newDoc;
    },
    async update(id, updateData) {
      const rows = readTable('documents');
      const idx = rows.findIndex(d => d.id === id);
      if (idx === -1) return null;

      const doc = rows[idx];
      const newVersion = (doc.version || 1) + 1;
      doc.title = updateData.title || doc.title;
      doc.theme = updateData.theme || doc.theme;
      if (updateData.ast) doc.ast = updateData.ast;
      doc.version = newVersion;
      doc.updated_at = new Date().toISOString();

      rows[idx] = doc;
      writeTable('documents', rows);

      await db.document_versions.create({
        document_id: doc.id,
        version_num: newVersion,
        ast: doc.ast,
        summary: updateData.summary || `Revision v${newVersion}`
      });
      return doc;
    },
    async delete(id) {
      let rows = readTable('documents');
      rows = rows.filter(d => d.id !== id);
      writeTable('documents', rows);
      return true;
    }
  },
  document_versions: {
    async listByDocumentId(documentId) {
      return readTable('document_versions').filter(v => v.document_id === documentId).sort((a, b) => b.version_num - a.version_num);
    },
    async findById(versionId) {
      return readTable('document_versions').find(v => v.id === versionId) || null;
    },
    async create(versionData) {
      const rows = readTable('document_versions');
      const newVer = {
        id: 'ver_' + crypto.randomBytes(8).toString('hex'),
        document_id: versionData.document_id,
        version_num: versionData.version_num || 1,
        summary: versionData.summary || 'Auto-Save Revision',
        ast: versionData.ast,
        created_at: new Date().toISOString()
      };
      rows.push(newVer);
      writeTable('document_versions', rows);
      return newVer;
    }
  },
  templates: {
    async listAll() { return readTable('templates'); },
    async findById(id) { return readTable('templates').find(t => t.id === id) || null; }
  }
};

module.exports = db;
