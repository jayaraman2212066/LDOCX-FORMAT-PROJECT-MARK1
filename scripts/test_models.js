const http = require('http');
const fs = require('fs');
const path = require('path');
const { ChromeController } = require('../tests/cdp_helper');

const rootDir = path.resolve(__dirname, '..');
const port = 9006;
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  let filePath = path.join(rootDir, reqPath);
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4'
  };
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', async () => {
  const ctrl = new ChromeController({ port: 9358 });
  await ctrl.start();
  await ctrl.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await ctrl.navigate('http://127.0.0.1:' + port + '/index.html');
  await new Promise(r => setTimeout(r, 1800));

  // Test Satellite
  await ctrl.evaluate('switchHero3DModel("satellite")');
  await new Promise(r => setTimeout(r, 400));
  await ctrl.evaluate('document.querySelector(".hero-dual-grid").scrollIntoView({ behavior: "instant", block: "center" })');
  await new Promise(r => setTimeout(r, 400));
  await ctrl.captureScreenshot(path.join(rootDir, 'tests', 'output', 'model_satellite.png'));
  console.log('✓ Satellite captured');

  // Test Quantum
  await ctrl.evaluate('switchHero3DModel("quantum")');
  await new Promise(r => setTimeout(r, 500));
  await ctrl.captureScreenshot(path.join(rootDir, 'tests', 'output', 'model_quantum.png'));
  console.log('✓ Quantum captured');

  // Test Tourbillon
  await ctrl.evaluate('switchHero3DModel("tourbillon")');
  await new Promise(r => setTimeout(r, 500));
  await ctrl.captureScreenshot(path.join(rootDir, 'tests', 'output', 'model_tourbillon.png'));
  console.log('✓ Tourbillon captured');

  // Back to Vanguard
  await ctrl.evaluate('switchHero3DModel("vanguard")');
  await new Promise(r => setTimeout(r, 500));
  console.log('✓ Back to Vanguard');

  await ctrl.close();
  server.close();
  process.exit(0);
});
