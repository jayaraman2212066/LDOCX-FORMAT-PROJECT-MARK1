/**
 * LDOCX Living Document Platform — Local Development & Preview Server
 * Zero-dependency local server with clean URL routing, MIME type resolution,
 * byte-range video streaming, and CORS support.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.ldocx': 'application/octet-stream',
  '.zip': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function resolveFilePath(reqPath) {
  let decodedPath = decodeURIComponent(reqPath.split('?')[0]);
  if (decodedPath === '/' || decodedPath === '') {
    return path.join(publicDir, 'index.html');
  }

  // Check 1: Exact match in public
  let candidate = path.join(publicDir, decodedPath);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  // Check 2: Clean directory route in public (e.g. /studio -> public/studio/index.html)
  let dirIndex = path.join(publicDir, decodedPath, 'index.html');
  if (fs.existsSync(dirIndex) && fs.statSync(dirIndex).isFile()) {
    return dirIndex;
  }

  // Check 3: HTML extension in public (e.g. /studio -> public/studio.html)
  let htmlCandidate = path.join(publicDir, `${decodedPath}.html`);
  if (fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
    return htmlCandidate;
  }

  // Check 4: Exact match in rootDir
  let rootCandidate = path.join(rootDir, decodedPath);
  if (fs.existsSync(rootCandidate) && fs.statSync(rootCandidate).isFile()) {
    return rootCandidate;
  }

  // Check 5: HTML extension in rootDir
  let rootHtmlCandidate = path.join(rootDir, `${decodedPath}.html`);
  if (fs.existsSync(rootHtmlCandidate) && fs.statSync(rootHtmlCandidate).isFile()) {
    return rootHtmlCandidate;
  }

  return null;
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const filePath = resolveFilePath(req.url);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
<head><title>404 Not Found - LDOCX</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f3f4f6; text-align: center; padding-top: 100px; }
  h1 { font-size: 48px; margin-bottom: 12px; color: #ef4444; }
  p { font-size: 18px; color: #9ca3af; }
  a { color: #3b82f6; text-decoration: none; font-weight: 600; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
  <h1>404 Not Found</h1>
  <p>The requested route <code>${req.url}</code> was not found on this local server.</p>
  <p><a href="/">Return to LDOCX Home</a> | <a href="/studio">Launch Studio</a> | <a href="/viewer">Open Viewer</a></p>
</body>
</html>`);
    return;
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Support Byte-Range requests for media (.mp4, etc.)
  const range = req.headers.range;
  if (range && ext === '.mp4') {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    });
    file.pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Length': stat.size,
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 LDOCX LIVING DOCUMENT STUDIO: LOCAL SERVER RUNNING          ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`\n  Local URL        : http://localhost:${PORT}/`);
  console.log(`  Network URL      : http://127.0.0.1:${PORT}/`);
  console.log('\n  Available Endpoints:');
  console.log(`  • Home / Showcase: http://localhost:${PORT}/`);
  console.log(`  • Studio Editor  : http://localhost:${PORT}/studio`);
  console.log(`  • Viewer         : http://localhost:${PORT}/viewer`);
  console.log(`  • Creator Canvas : http://localhost:${PORT}/creator`);
  console.log(`  • Live Studio    : http://localhost:${PORT}/live-studio`);
  console.log(`  • Documentation  : http://localhost:${PORT}/docs`);
  console.log(`  • Flagship Demo  : http://localhost:${PORT}/all-features-showcase.ldocx\n`);
  console.log('  Press Ctrl+C to terminate the local server.\n');
});
