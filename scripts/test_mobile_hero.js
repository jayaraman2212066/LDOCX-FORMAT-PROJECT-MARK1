const http = require('http');
const fs = require('fs');
const path = require('path');
const { ChromeController } = require('../tests/cdp_helper');

const rootDir = path.resolve(__dirname, '..');
const port = 9007;
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
  const ctrl = new ChromeController({ port: 9360 });
  await ctrl.start();
  await ctrl.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await ctrl.navigate('http://127.0.0.1:' + port + '/index.html');
  await new Promise(r => setTimeout(r, 2000));

  const overflow = await ctrl.evaluate('document.documentElement.scrollWidth > window.innerWidth');
  console.log('Mobile 390px has horizontal scroll overflow:', overflow);

  await ctrl.evaluate('document.querySelector(".hero-dual-grid").scrollIntoView({ behavior: "instant", block: "start" })');
  await new Promise(r => setTimeout(r, 600));
  await ctrl.captureScreenshot(path.join(rootDir, 'tests', 'output', 'mobile_dual_window.png'));
  console.log('✓ Captured tests/output/mobile_dual_window.png');

  await ctrl.close();
  server.close();
  process.exit(0);
});
