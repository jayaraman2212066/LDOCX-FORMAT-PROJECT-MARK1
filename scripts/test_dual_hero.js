const http = require('http');
const fs = require('fs');
const path = require('path');
const { ChromeController } = require('../tests/cdp_helper');

const rootDir = path.resolve(__dirname, '..');
const port = 9005;
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
    '.webp': 'image/webp',
    '.mp4': 'video/mp4'
  };
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, '127.0.0.1', async () => {
  const ctrl = new ChromeController({ port: 9355 });
  await ctrl.start();
  await ctrl.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  await ctrl.navigate('http://127.0.0.1:' + port + '/index.html');
  await new Promise(r => setTimeout(r, 2200));

  const status = await ctrl.evaluate(`(() => {
    const c = document.getElementById('hero-real-3d-canvas');
    const v = document.getElementById('hero-side-video');
    const g = document.querySelector('.hero-dual-grid');
    return {
      canvasRect: c ? { width: c.clientWidth, height: c.clientHeight } : null,
      videoRect: v ? { width: v.clientWidth, height: v.clientHeight } : null,
      gridRect: g ? { width: g.clientWidth, height: g.clientHeight } : null,
      videoPaused: v ? v.paused : null,
      threeLoaded: typeof THREE !== 'undefined'
    };
  })()`);
  console.log('Dual Window Status:', JSON.stringify(status, null, 2));

  await ctrl.evaluate('document.querySelector(".hero-dual-grid").scrollIntoView({ behavior: "instant", block: "center" })');
  await new Promise(r => setTimeout(r, 800));

  await ctrl.captureScreenshot(path.join(rootDir, 'tests', 'output', 'hero_dual_window_preview.png'));
  console.log('✓ Captured tests/output/hero_dual_window_preview.png');
  await ctrl.close();
  server.close();
  process.exit(0);
});
