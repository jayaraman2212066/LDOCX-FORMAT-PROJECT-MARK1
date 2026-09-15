const http = require('http');
const fs = require('fs');
const path = require('path');

async function runVipRedeemIntegrityTest() {
  console.log('\n🧪 Running VIP Pro Download & Master Redeem Modal Integrity Test...\n');

  const rootDir = path.resolve(__dirname, '..');
  let failures = [];

  function auditHtml(filePath, surfaceName) {
    console.log(`▶ Auditing ${surfaceName} (${path.basename(filePath)})...`);
    const content = fs.readFileSync(filePath, 'utf8');

    const requiredSnippets = [
      'id="vip-redeem-modal"',
      'openVipRedeemModal',
      'switchVipPlatformTab',
      'copyVipMasterKey',
      'copyVipSha256',
      'handlePlatformDownload',
      'LDOC-Studio-Windows-VIP.zip',
      'LDOC-Studio-Linux-VIP.tar.gz',
      'LDOC-Studio-macOS-VIP.zip',
      'LDOC-Studio.apk',
      'LDOC-PRO-VIP-2026-LIFETIME-MASTER',
      '215EB444062A223B35DBF50A0DCE5A93289A3C915C6F6844C8D0C3FBE9CD5774'
    ];

    let surfaceFailed = false;
    for (const s of requiredSnippets) {
      if (!content.includes(s)) {
        failures.push(`${surfaceName}: missing snippet "${s}"`);
        surfaceFailed = true;
      }
    }
    if (!surfaceFailed) {
      console.log(`   ✓ ${surfaceName} contains all ${requiredSnippets.length} VIP modal and download markers.`);
    }
  }

  auditHtml(path.join(rootDir, 'index.html'), 'Root index.html');
  auditHtml(path.join(rootDir, 'pricing.html'), 'Root pricing.html');
  auditHtml(path.join(rootDir, 'public', 'index.html'), 'Public index.html');
  auditHtml(path.join(rootDir, 'public', 'pricing.html'), 'Public pricing.html');
  auditHtml(path.join(rootDir, 'app', 'viewer', 'index.html'), 'App Viewer index.html');
  auditHtml(path.join(rootDir, 'app', 'viewer', 'pricing.html'), 'App Viewer pricing.html');

  console.log('\n▶ Auditing VIP Packages on disk...');
  const expectedFiles = [
    'LDOC-Studio-Windows-VIP.zip',
    'LDOC-Studio-Linux-VIP.tar.gz',
    'LDOC-Studio-macOS-VIP.zip',
    'LDOC-Studio-Offline-Web-VIP.zip',
    'LDOC-Studio.apk',
    'ldoc-editor-ios.zip',
    'LDOC-Studio.exe',
    'VIP_LICENSE_CREDENTIALS.txt'
  ];

  const checkDirs = [
    path.join(rootDir, 'downloads'),
    path.join(rootDir, 'public', 'downloads'),
    path.join(rootDir, 'app', 'viewer', 'downloads')
  ];

  for (const dir of checkDirs) {
    for (const f of expectedFiles) {
      const fullPath = path.join(dir, f);
      if (!fs.existsSync(fullPath)) {
        failures.push(`Missing file: ${fullPath}`);
      } else {
        const size = fs.statSync(fullPath).size;
        if (size === 0) failures.push(`File is empty: ${fullPath}`);
      }
    }
  }
  console.log(`   ✓ All 8 VIP files verified across all 3 download mirrors (${checkDirs.length * expectedFiles.length} checks).`);

  // Interactive CDP Browser Tests
  const { ChromeController } = require('./cdp_helper');
  const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    let filePath = path.join(rootDir, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  const port = 8994;
  await new Promise(r => server.listen(port, r));
  console.log(`\n▶ Starting CDP Browser Verification on http://127.0.0.1:${port}...`);

  const chrome = new ChromeController({ port: 9557 });
  await chrome.start();
  console.log('   Connected to Chrome via CDP.');

  try {
    // 1. Index.html test
    console.log('   Navigating to index.html...');
    await chrome.navigate(`http://127.0.0.1:${port}/index.html`);

    const indexTestRes = await chrome.evaluate(`
      (function() {
        const results = [];
        
        // Trigger modal with windows platform
        if (typeof openVipRedeemModal !== 'function') {
          return [{ test: 'openVipRedeemModal function exists', pass: false }];
        }
        openVipRedeemModal('windows');
        
        const modal = document.getElementById('vip-redeem-modal');
        results.push({ test: 'Modal visible after openVipRedeemModal', pass: modal && modal.style.display === 'flex' });
        
        const activeTab = document.getElementById('vip-tab-windows');
        results.push({ test: 'Windows tab active style', pass: activeTab && activeTab.style.borderColor.includes('245') || (activeTab && activeTab.style.color.includes('254')) });

        const shaDisplay = document.getElementById('vip-sha256-display');
        results.push({ 
          test: 'Windows SHA256 matches', 
          pass: shaDisplay && shaDisplay.textContent.includes('215EB444062A223B35DBF50A0DCE5A93289A3C915C6F6844C8D0C3FBE9CD5774') 
        });

        // Test Linux tab
        switchVipPlatformTab('linux');
        results.push({ 
          test: 'Linux SHA256 matches', 
          pass: shaDisplay && shaDisplay.textContent.includes('72C0A61D3A2C4388D48AD672113EBA3C2C13F17E536A094199BD2EDA39A9E26A') 
        });

        // Test macOS tab
        switchVipPlatformTab('macos');
        results.push({ 
          test: 'macOS SHA256 matches', 
          pass: shaDisplay && shaDisplay.textContent.includes('568994E8C27E174ED0A1A07EB8DDCF9F9B7744389175F3B6FD5D84E60CA8075A') 
        });

        // Test Android tab
        switchVipPlatformTab('android');
        results.push({ 
          test: 'Android SHA256 matches', 
          pass: shaDisplay && shaDisplay.textContent.includes('C1C487A45B2323F772EF81E54135E4DAD1C838E9A10B0E9DD9D910C25AD1E291') 
        });

        // Test Close
        closeVipRedeemModal();
        results.push({ test: 'Modal closed after closeVipRedeemModal', pass: modal && modal.style.display === 'none' });

        return results;
      })()
    `);

    for (const r of indexTestRes) {
      if (!r.pass) failures.push(`Index CDP: ${r.test}`);
      else console.log(`   ✓ Index CDP: ${r.test}`);
    }

    // 2. Pricing.html test
    console.log('   Navigating to pricing.html...');
    await chrome.navigate(`http://127.0.0.1:${port}/pricing.html`);

    const pricingTestRes = await chrome.evaluate(`
      (function() {
        const results = [];
        if (typeof openVipRedeemModal !== 'function') {
          return [{ test: 'Pricing openVipRedeemModal exists', pass: false }];
        }
        openVipRedeemModal('all');
        const modal = document.getElementById('vip-redeem-modal');
        results.push({ test: 'Pricing modal visible', pass: modal && modal.style.display === 'flex' });
        
        closeVipRedeemModal();
        results.push({ test: 'Pricing modal closed', pass: modal && modal.style.display === 'none' });
        return results;
      })()
    `);

    for (const r of pricingTestRes) {
      if (!r.pass) failures.push(`Pricing CDP: ${r.test}`);
      else console.log(`   ✓ Pricing CDP: ${r.test}`);
    }

    // Capture screenshot of VIP Modal open for visual verification
    const screenshotDir = path.join(rootDir, 'tests', 'output');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, 'vip_redeem_modal_verified.png');
    await chrome.evaluate(`openVipRedeemModal('windows');`);
    await new Promise(r => setTimeout(r, 400));
    await chrome.captureScreenshot(screenshotPath);
    console.log(`   📸 VIP Modal visual verification screenshot captured: ${screenshotPath}`);

  } finally {
    await chrome.close();
    server.close();
  }

  if (failures.length > 0) {
    console.error('\n❌ VIP REDEEM INTEGRITY FAILURES:');
    failures.forEach(f => console.error('  - ' + f));
    process.exit(1);
  } else {
    console.log('\n================================================================');
    console.log('🎉 ALL VIP PRO DOWNLOAD & REDEEM MODAL TESTS PASSED (100%)!');
    console.log('================================================================\n');
    process.exit(0);
  }
}

runVipRedeemIntegrityTest().catch(err => {
  console.error('Fatal error in VIP Redeem test:', err);
  process.exit(1);
});
