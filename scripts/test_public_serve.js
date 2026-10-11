const http = require('http');
const fs = require('fs');
const path = require('path');
const { ChromeController } = require('../tests/cdp_helper');

const publicDir = path.resolve(__dirname, '..', 'public');
const port = 9010;
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  let filePath = path.join(publicDir, reqPath);
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found: ' + req.url); return; }
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
  console.log('Serving public/ on ' + port);
  const ctrl = new ChromeController({ port: 9365 });
  await ctrl.start();

  await ctrl.navigate('http://127.0.0.1:' + port + '/index.html');
  await new Promise(r => setTimeout(r, 2000));

  const check = await ctrl.evaluate(`(() => {
    const canvas = document.getElementById('hero-real-3d-canvas');
    const video = document.getElementById('hero-side-video');
    return {
      canvasExists: !!canvas,
      canvasInitialized: canvas ? canvas.dataset.initialized : null,
      canvasWidth: canvas ? canvas.clientWidth : 0,
      canvasHeight: canvas ? canvas.clientHeight : 0,
      threeLoaded: typeof THREE !== 'undefined',
      initFuncLoaded: typeof initVanguardHero3D === 'function',
      videoPlaying: video ? !video.paused : null
    };
  })()`);

  console.log('Public build audit:', JSON.stringify(check, null, 2));

  await ctrl.close();
  server.close();
  process.exit(0);
});
