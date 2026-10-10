const http = require('http');
const fs = require('fs');
const path = require('path');
const { ChromeController } = require('./cdp_helper');

async function testPricingVisual() {
  const port = 8994;
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    let filePath = path.join(__dirname, '..', reqPath);
    if (fs.existsSync(filePath + '.html')) filePath = filePath + '.html';
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  }).listen(port);

  const chrome = new ChromeController({ port: 9342 });
  await chrome.start();
  await chrome.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false
  });
  await chrome.navigate('http://127.0.0.1:' + port + '/pricing');
  await new Promise(r => setTimeout(r, 1500));

  await chrome.captureScreenshot(path.join(__dirname, 'output', 'pricing_top_clean.png'));
  console.log('Saved top screenshot');

  // Scroll to bottom of page
  await chrome.evaluate(`window.scrollTo(0, document.body.scrollHeight)`);
  await new Promise(r => setTimeout(r, 1000));

  await chrome.captureScreenshot(path.join(__dirname, 'output', 'pricing_bottom_clean.png'));
  console.log('Saved bottom screenshot');

  server.close();
  process.exit(0);
}
testPricingVisual().catch(err => { console.error(err); process.exit(1); });
