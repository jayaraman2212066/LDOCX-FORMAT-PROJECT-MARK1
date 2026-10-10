const http = require('http');
const fs = require('fs');
const path = require('path');
const { ChromeController } = require('../tests/cdp_helper');

const rootDir = path.resolve(__dirname, '..');
const auditDir = path.join(rootDir, 'tests', 'output', 'audit');
if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });

const routes = [
  { path: '/', name: 'home', file: 'index.html' },
  { path: '/features', name: 'features', file: 'features.html' },
  { path: '/format', name: 'format', file: 'format.html' },
  { path: '/live-studio', name: 'live-studio', file: 'live-studio.html' },
  { path: '/models', name: 'models', file: 'models.html' },
  { path: '/pricing', name: 'pricing', file: 'pricing.html' },
  { path: '/docs', name: 'docs', file: 'docs.html' },
  { path: '/changelog', name: 'changelog', file: 'changelog.html' },
  { path: '/creator', name: 'creator', file: 'creator.html' },
  { path: '/security', name: 'security', file: 'security.html' }
];

async function runDiagnosis() {
  console.log('Starting local HTTP server for diagnosis...');
  const testPort = 8998;
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.ico': 'image/x-icon'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    
    // Support clean routes like /features -> features.html
    let filePath = path.join(rootDir, reqPath);
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      if (fs.existsSync(path.join(filePath, 'index.html'))) {
        filePath = path.join(filePath, 'index.html');
      }
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found: ' + req.url);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise(r => server.listen(testPort, '127.0.0.1', r));
  console.log(`Local server active on http://127.0.0.1:${testPort}`);

  const controller = new ChromeController({ port: 9338 });
  await controller.start();
  console.log('Chrome CDP initialized.');

  // Collect console logs and network failures
  const consoleMessages = [];
  controller.onEvent = (method, params) => {
    if (method === 'Runtime.consoleAPICalled') {
      const text = params.args.map(a => a.value || a.description || '').join(' ');
      consoleMessages.push({ type: params.type, text });
    }
  };

  const auditResults = [];

  for (const r of routes) {
    console.log(`\n========================================`);
    console.log(`Auditing Route: ${r.path} (${r.file})`);
    console.log(`========================================`);

    const url = `http://127.0.0.1:${testPort}${r.path}`;
    await controller.navigate(url);

    // 1. Audit at 1440px desktop
    await controller.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise(res => setTimeout(res, 600));

    // Full page scroll down and back to trigger IntersectionObserver
    await controller.evaluate(`
      window.scrollTo(0, document.body.scrollHeight / 2);
    `);
    await new Promise(res => setTimeout(res, 300));
    await controller.evaluate(`
      window.scrollTo(0, document.body.scrollHeight);
    `);
    await new Promise(res => setTimeout(res, 500));
    await controller.evaluate(`
      window.scrollTo(0, 0);
    `);
    await new Promise(res => setTimeout(res, 300));

    const shot1440 = path.join(auditDir, `${r.name}_1440px.png`);
    await controller.captureScreenshot(shot1440);
    console.log(`✓ Captured 1440px screenshot: ${shot1440}`);

    // 2. Audit at 390px mobile
    await controller.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(res => setTimeout(res, 600));

    // Scroll mobile page
    await controller.evaluate(`
      window.scrollTo(0, document.body.scrollHeight);
    `);
    await new Promise(res => setTimeout(res, 400));
    await controller.evaluate(`
      window.scrollTo(0, 0);
    `);
    await new Promise(res => setTimeout(res, 300));

    const shot390 = path.join(auditDir, `${r.name}_390px.png`);
    await controller.captureScreenshot(shot390);
    console.log(`✓ Captured 390px screenshot: ${shot390}`);

    // 3. Inspect In-Page State
    const pageMetrics = await controller.evaluate(`
      (function() {
        // Elements stuck at opacity 0
        const allEls = Array.from(document.querySelectorAll('*'));
        const stuckOpacity0 = allEls.filter(el => {
          const s = window.getComputedStyle(el);
          return s.opacity === '0' && s.display !== 'none' && s.visibility !== 'hidden' && el.offsetHeight > 10;
        }).map(el => el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''));

        // Videos
        const videos = Array.from(document.querySelectorAll('video')).map(v => ({
          src: v.src || v.currentSrc,
          readyState: v.readyState,
          paused: v.paused,
          error: v.error ? v.error.message : null,
          w: v.offsetWidth,
          h: v.offsetHeight
        }));

        // Canvases (WebGL, 2D)
        const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
          id: c.id,
          w: c.offsetWidth,
          h: c.offsetHeight,
          gl: !!(c.getContext('webgl') || c.getContext('webgl2'))
        }));

        // Animations / Keyframes
        const animations = allEls.filter(el => {
          const s = window.getComputedStyle(el);
          return s.animationName && s.animationName !== 'none';
        }).length;

        // Transitions defined
        const transitions = allEls.filter(el => {
          const s = window.getComputedStyle(el);
          return s.transitionProperty && s.transitionProperty !== 'none' && s.transitionProperty !== 'all 0s ease 0s';
        }).length;

        // Stylesheets loaded
        const sheets = Array.from(document.styleSheets).map(s => s.href ? s.href.split('/').pop() : 'inline');

        // Horizontal overflow check for 390px
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const hasHScroll = docWidth > 390 || bodyWidth > 390;

        return {
          stuckOpacity0: stuckOpacity0.slice(0, 10),
          stuckCount: stuckOpacity0.length,
          videos,
          canvases,
          animationCount: animations,
          transitionCount: transitions,
          sheets,
          hasHScroll,
          docWidth,
          bodyWidth
        };
      })()
    `);

    auditResults.push({
      route: r.path,
      file: r.file,
      metrics: pageMetrics,
      consoleErrors: consoleMessages.filter(m => m.type === 'error').slice(-5)
    });
  }

  await controller.close();
  server.close();

  fs.writeFileSync(path.join(auditDir, 'audit_report.json'), JSON.stringify(auditResults, null, 2), 'utf8');
  console.log('\nAudit complete! Report saved to tests/output/audit/audit_report.json');
}

runDiagnosis().catch(err => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});
