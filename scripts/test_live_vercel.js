const { ChromeController } = require('../tests/cdp_helper');
const path = require('path');

(async () => {
  const ctrl = new ChromeController({ port: 9370 });
  await ctrl.start();
  await ctrl.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await ctrl.navigate('https://ldoc-studios.vercel.app');
  await new Promise(r => setTimeout(r, 3500));

  const status = await ctrl.evaluate(`(() => {
    const c = document.getElementById('hero-real-3d-canvas');
    const v = document.getElementById('hero-side-video');
    return {
      canvasExists: !!c,
      canvasInitialized: c ? c.dataset.initialized : null,
      threeLoaded: typeof THREE !== 'undefined',
      videoPlaying: v ? !v.paused : null
    };
  })()`);

  console.log('Live Vercel Audit:', JSON.stringify(status, null, 2));

  await ctrl.evaluate('document.querySelector(".hero-dual-grid").scrollIntoView({ behavior: "instant", block: "center" })');
  await new Promise(r => setTimeout(r, 1200));
  await ctrl.captureScreenshot(path.join(__dirname, '..', 'tests', 'output', 'live_vercel_dual_window.png'));
  console.log('✓ Captured tests/output/live_vercel_dual_window.png from live Vercel production!');

  await ctrl.close();
  process.exit(0);
})();
