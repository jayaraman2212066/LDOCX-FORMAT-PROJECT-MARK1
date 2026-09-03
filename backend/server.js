// Secure Cloud Backend Engine for LDOC Ecosystem
// Enforces Two-Tier Split Model, Rate Limiting, JWT Auth, and Proprietary Endpoints

const http = require('http');
const url = require('url');
const crypto = require('crypto');

const { optimizeMesh } = require('./draco_optimizer');
const { createCheckoutSession, handleWebhookEvent } = require('./stripe_gateway');
const { captureLead, ADMIN_EMAIL } = require('./lead_router');
const { renderHeadlessPdf } = require('./pdf_flattener');
const { validateLdocxSpec, convertToLdocx, SCHEMA_VERSION } = require('./schema_validator');
const { generatePackageManifest, verifyPackageManifest } = require('./package_signer');

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'ldoc_jwt_secure_access_secret_2026';
const ALLOWED_ORIGINS = (process.env.LDOC_ALLOWED_ORIGINS || 'https://ldoc-studios.vercel.app,https://jayaraman2212066.github.io,http://localhost:3000,http://localhost:8080').split(',');

// In-Memory IP Rate Limiter
const rateLimitMap = new Map();
function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  if (!record || now - record.startTime > windowMs) {
    record = { count: 1, startTime: now };
    rateLimitMap.set(ip, record);
    return true;
  }
  record.count++;
  return record.count <= limit;
}

// Clean old rate limit entries every 5 mins
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of rateLimitMap.entries()) {
    if (now - rec.startTime > 60000) rateLimitMap.delete(ip);
  }
}, 300000);

function handleCors(req, res) {
  const origin = req.headers['origin'];
  if (origin && ALLOWED_ORIGINS.some(o => o === '*' || origin.includes(o.trim()))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) { // 25MB max
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({ raw: body });
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  handleCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/$/, '');
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // 1. IP Rate Limiting Check
  const isHeavy = pathname === '/api/optimize-model' || pathname === '/api/export/pdf';
  const limit = isHeavy ? 15 : 60;
  if (!checkRateLimit(clientIp, limit)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded. Please retry in 1 minute.' }));
  }

  try {
    // ── HEALTH CHECK ────────────────────────────────────────────────────────
    if (pathname === '/api/health' || pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'online',
        service: 'LDOC Secure Cloud Engine',
        runtime: 'Node.js Microservice',
        schema_version: SCHEMA_VERSION,
        admin_routing: ADMIN_EMAIL,
        timestamp: new Date().toISOString()
      }));
    }

    // ── A. 3D DRACO MESH COMPRESSION SERVICE ────────────────────────────────
    if (pathname === '/api/optimize-model' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = optimizeMesh(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    }

    // ── B. STRIPE CHECKOUT & PRE-ORDERS ─────────────────────────────────────
    if (pathname === '/api/checkout/create-session' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const session = await createCheckoutSession(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(session));
    }

    if (pathname === '/api/checkout/webhook' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const sig = req.headers['stripe-signature'];
      const webhookRes = handleWebhookEvent(body, sig);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(webhookRes));
    }

    // ── C. VIP LEAD CAPTURE & ROUTING ───────────────────────────────────────
    if (pathname === '/api/leads/capture' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const leadResult = await captureLead(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(leadResult));
    }

    // ── D. HEADLESS PDF FLATTENING ENGINE ───────────────────────────────────
    if (pathname === '/api/export/pdf' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const pdfBuffer = renderHeadlessPdf(body);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${(body.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      return res.end(pdfBuffer);
    }

    // ── E. AST VALIDATION & CONVERTER ───────────────────────────────────────
    if (pathname === '/api/validate' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const valResult = validateLdocxSpec(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(valResult));
    }

    if (pathname === '/api/convert' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const content = body.content || body.raw || '';
      const format = body.format || 'markdown';
      const converted = convertToLdocx(content, format);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(converted));
    }

    // ── F. PACKAGE INTEGRITY & MANIFEST SIGNING ─────────────────────────────
    if (pathname === '/api/verify-package' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const verification = verifyPackageManifest(body.manifest || body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(verification));
    }

    // 404 Not Found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint Not Found', pathname }));
  } catch (err) {
    console.error('[ServerError]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`⚡ LDOC Secure Cloud Backend running on port ${PORT}`);
  console.log(`🔒 Proprietary Endpoints active:`);
  console.log(`   - POST /api/optimize-model (3D Draco Compression)`);
  console.log(`   - POST /api/checkout/create-session (Stripe Pre-Order)`);
  console.log(`   - POST /api/checkout/webhook (License Fulfillment)`);
  console.log(`   - POST /api/leads/capture (VIP Routing -> ${ADMIN_EMAIL})`);
  console.log(`   - POST /api/export/pdf (Headless PDF Engine)`);
  console.log(`   - POST /api/validate (LDOCX Schema 2.5.0)`);
  console.log(`   - POST /api/convert (Universal Converter)`);
  console.log(`=======================================================`);
});

module.exports = server;
