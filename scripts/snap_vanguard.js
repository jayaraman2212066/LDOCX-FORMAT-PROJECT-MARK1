const http = require('http');
const fs = require('fs');
const path = require('path');
const { ChromeController } = require('../tests/cdp_helper');

const rootDir = path.resolve(__dirname, '..');
const port = 9003;
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  let filePath = path.join(rootDir, reqPath);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end();
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.mp4': 'video/mp4'
  };
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', async () => {
  const ctrl = new ChromeController({ port: 9349 });
  await ctrl.start();
  await ctrl.navigate(`http://127.0.0.1:${port}/index.html`);
  await new Promise(r => setTimeout(r, 2000));
  await ctrl.evaluate('document.querySelector(".macos-app-window").scrollIntoView({ behavior: "instant", block: "center" })');
  await new Promise(r => setTimeout(r, 800));
  await ctrl.captureScreenshot(path.join(rootDir, 'tests', 'output', 'vanguard_3d_stage_scrolled.png'));
  await ctrl.close();
  server.close();
  console.log('✓ Captured tests/output/vanguard_3d_stage_scrolled.png');
});
