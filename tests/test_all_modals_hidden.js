const http = require('http');
const fs = require('fs');
const path = require('path');
const { ChromeController } = require('./cdp_helper');

const rootDir = path.resolve(__dirname, '..');
const testPort = 8999;
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
    '.png': 'image/png'
  };
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(testPort, '127.0.0.1', async () => {
  console.log(`Test server active on port ${testPort}`);
  const ctrl = new ChromeController({ port: 9338 });
  await ctrl.start();

  const pages = [
    'index.html', 'features.html', 'format.html', 'live-studio.html',
    'models.html', 'pricing.html', 'docs.html', 'changelog.html',
    'creator.html', 'security.html'
  ];

  let anyLeaked = false;

  for (const page of pages) {
    await ctrl.navigate(`http://127.0.0.1:${testPort}/${page}`);
    await new Promise(r => setTimeout(r, 600));

    const res = await ctrl.evaluate(`
      (() => {
        const modals = Array.from(document.querySelectorAll('.ldoc-cloud-modal-overlay, .drawer-overlay, [class*="modal-overlay"]'));
        const visibleModals = modals.filter(m => {
          const style = window.getComputedStyle(m);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
        return {
          total: modals.length,
          visibleCount: visibleModals.length,
          visibleIds: visibleModals.map(m => m.id || m.className)
        };
      })()
    `);

    const data = res;
    console.log(`[${page}] Total overlays: ${data.total}, Visible on load: ${data.visibleCount} ${data.visibleCount > 0 ? '❌ LEAK: ' + data.visibleIds.join(', ') : '✓ OK'}`);
    if (data.visibleCount > 0) anyLeaked = true;
  }

  await ctrl.close();
  server.close();

  if (anyLeaked) {
    console.error('FAILED: One or more modals leaked on page load!');
    process.exit(1);
  } else {
    console.log('\nPASSED: 0 modals leaked across all 10 pages on load.');
    process.exit(0);
  }
});
