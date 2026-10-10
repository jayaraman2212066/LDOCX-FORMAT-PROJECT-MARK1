const http = require('http');
const fs = require('fs');
const path = require('path');
const { ChromeController } = require('./cdp_helper');

async function findStickingOut() {
  const port = 8991;
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json'
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

  const chrome = new ChromeController({ port: 9345 });
  await chrome.start();
  await chrome.send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true
  });
  await chrome.navigate('http://127.0.0.1:' + port + '/pricing');
  await new Promise(r => setTimeout(r, 1500));

  const overflowReport = await chrome.evaluate(`
    (() => {
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const stickingOut = Array.from(document.querySelectorAll('*')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.right > 391;
      }).map(el => {
        const c = typeof el.className === 'string' ? el.className : '';
        return {
          tag: el.tagName + (el.id ? '#' + el.id : '') + (c ? '.' + c.split(' ').join('.').slice(0, 30) : ''),
          right: Math.round(el.getBoundingClientRect().right),
          width: Math.round(el.getBoundingClientRect().width)
        };
      });
      return { docW, bodyW, stickingOut: stickingOut.slice(0, 15) };
    })()
  `);
  console.log('Overflow report on pricing:', overflowReport);
  server.close();
  process.exit(0);
}
findStickingOut().catch(err => { console.error(err); process.exit(1); });
