/**
 * Diagnostic drawer and overlay hit-test script
 */
const { ChromeController } = require('./cdp_helper');
const path = require('path');
const fs = require('fs');

async function run() {
  const cdp = new ChromeController({ port: 9444 });
  console.log('▶ Starting Headless Chrome for Drawer & Overlay Diagnosis...');
  await cdp.start();

  const fileUrl = 'file:///' + path.resolve(__dirname, '..', 'creator.html').replace(/\\/g, '/');
  console.log('▶ Navigating to:', fileUrl);
  await cdp.send('Page.navigate', { url: fileUrl });
  await new Promise(r => setTimeout(r, 1500));

  // Test 1: Open Left Drawer (Pages & Meta) in creator.html
  console.log('\n--- Test 1: Creator #left Drawer ---');
  await cdp.send('Runtime.evaluate', { expression: 'togglePagesDrawer();' });
  await new Promise(r => setTimeout(r, 500));

  let res = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const left = document.getElementById('left');
      const rect = left.getBoundingClientRect();
      const ptX = rect.left + rect.width / 2;
      const ptY = rect.top + 60; // near top of drawer
      const topEl = document.elementFromPoint(ptX, ptY);
      return {
        leftOpen: left.classList.contains('open'),
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        pt: { x: ptX, y: ptY },
        topElementTag: topEl ? topEl.tagName : null,
        topElementId: topEl ? topEl.id : null,
        topElementClass: topEl ? topEl.className : null,
        isInsideLeft: left.contains(topEl)
      };
    })()`,
    returnByValue: true
  });
  console.log('Creator #left hit test:', JSON.stringify(res.result.value, null, 2));

  // Test 2: Open Center Drawer (Blocks Editor) while Left is open
  console.log('\n--- Test 2: Creator #center Drawer while #left open ---');
  await cdp.send('Runtime.evaluate', { expression: 'toggleBlocksDrawer();' });
  await new Promise(r => setTimeout(r, 500));

  res = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const center = document.getElementById('center');
      const rect = center.getBoundingClientRect();
      const ptX = rect.left + rect.width / 2;
      const ptY = rect.top + 60;
      const topEl = document.elementFromPoint(ptX, ptY);
      return {
        centerOpen: center.classList.contains('open'),
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        pt: { x: ptX, y: ptY },
        topElementTag: topEl ? topEl.tagName : null,
        topElementId: topEl ? topEl.id : null,
        topElementClass: topEl ? topEl.className : null,
        isInsideCenter: center.contains(topEl)
      };
    })()`,
    returnByValue: true
  });
  console.log('Creator #center hit test:', JSON.stringify(res.result.value, null, 2));

  // Test 3: Check #left hit test while #center is open
  console.log('\n--- Test 3: Creator #left hit test while #center is open ---');
  res = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const left = document.getElementById('left');
      const rect = left.getBoundingClientRect();
      const ptX = rect.left + 50;
      const ptY = rect.top + 60;
      const topEl = document.elementFromPoint(ptX, ptY);
      return {
        topElementTag: topEl ? topEl.tagName : null,
        topElementId: topEl ? topEl.id : null,
        topElementClass: topEl ? topEl.className : null,
        isInsideLeft: left.contains(topEl)
      };
    })()`,
    returnByValue: true
  });
  console.log('Creator #left hit test while #center open:', JSON.stringify(res.result.value, null, 2));

  // Test 4: Open FX Wizard Sidebar in Creator
  console.log('\n--- Test 4: Creator #fx-wizard-sidebar ---');
  await cdp.send('Runtime.evaluate', { expression: 'toggleFxWizard();' });
  await new Promise(r => setTimeout(r, 500));

  res = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const fx = document.getElementById('fx-wizard-sidebar');
      const rect = fx.getBoundingClientRect();
      const ptX = rect.left + rect.width / 2;
      const ptY = rect.top + 60;
      const topEl = document.elementFromPoint(ptX, ptY);
      return {
        fxOpen: fx.classList.contains('open'),
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        pt: { x: ptX, y: ptY },
        topElementTag: topEl ? topEl.tagName : null,
        topElementId: topEl ? topEl.id : null,
        topElementClass: topEl ? topEl.className : null,
        isInsideFx: fx.contains(topEl)
      };
    })()`,
    returnByValue: true
  });
  console.log('Creator #fx-wizard-sidebar hit test:', JSON.stringify(res.result.value, null, 2));

  // Test 5: Studio index.html
  console.log('\n--- Test 5: Studio index.html Pages Drawer & Help Drawer ---');
  const studioUrl = 'file:///' + path.resolve(__dirname, '..', 'local_ldoc studio pro', 'clone_ldoc', 'index.html').replace(/\\/g, '/');
  await cdp.send('Page.navigate', { url: studioUrl });
  await new Promise(r => setTimeout(r, 1500));

  // Open pages panel in Studio
  await cdp.send('Runtime.evaluate', { expression: 'if (typeof togglePagesPanel === "function") togglePagesPanel();' });
  await new Promise(r => setTimeout(r, 500));

  res = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const panel = document.getElementById('pages-panel');
      const overlay = document.getElementById('pages-overlay');
      const rect = panel ? panel.getBoundingClientRect() : {};
      const ptX = rect.left + rect.width / 2;
      const ptY = rect.top + 80;
      const topEl = document.elementFromPoint(ptX, ptY);
      return {
        overlayOpen: overlay ? overlay.classList.contains('open') : false,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        pt: { x: ptX, y: ptY },
        topElementTag: topEl ? topEl.tagName : null,
        topElementId: topEl ? topEl.id : null,
        topElementClass: topEl ? topEl.className : null,
        isInsidePanel: panel ? panel.contains(topEl) : false
      };
    })()`,
    returnByValue: true
  });
  console.log('Studio Pages Panel hit test:', JSON.stringify(res.result.value, null, 2));

  // Open Help Drawer in Studio
  await cdp.send('Runtime.evaluate', { expression: 'if (typeof toggleHelpDrawer === "function") toggleHelpDrawer();' });
  await new Promise(r => setTimeout(r, 500));

  res = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const drawer = document.getElementById('help-drawer');
      const rect = drawer ? drawer.getBoundingClientRect() : {};
      const ptX = rect.left + rect.width / 2;
      const ptY = rect.top + 80;
      const topEl = document.elementFromPoint(ptX, ptY);
      return {
        drawerDisplay: drawer ? drawer.style.display : null,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        pt: { x: ptX, y: ptY },
        topElementTag: topEl ? topEl.tagName : null,
        topElementId: topEl ? topEl.id : null,
        topElementClass: topEl ? topEl.className : null,
        isInsideDrawer: drawer ? drawer.contains(topEl) : false
      };
    })()`,
    returnByValue: true
  });
  console.log('Studio Help Drawer hit test:', JSON.stringify(res.result.value, null, 2));

  // Open Layers Modal in Studio
  await cdp.send('Runtime.evaluate', { expression: 'if (window.LDocModals) window.LDocModals.showLayersModal();' });
  await new Promise(r => setTimeout(r, 500));

  res = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.getElementById('ldoc-layers-modal');
      const rect = modal ? modal.getBoundingClientRect() : {};
      const ptX = window.innerWidth / 2;
      const ptY = window.innerHeight / 2;
      const topEl = document.elementFromPoint(ptX, ptY);
      return {
        modalActive: modal ? modal.classList.contains('active') : false,
        pt: { x: ptX, y: ptY },
        topElementTag: topEl ? topEl.tagName : null,
        topElementId: topEl ? topEl.id : null,
        topElementClass: topEl ? topEl.className : null,
        isInsideModal: modal ? modal.contains(topEl) : false
      };
    })()`,
    returnByValue: true
  });
  console.log('Studio Layers Modal hit test:', JSON.stringify(res.result.value, null, 2));

  // Clean up
  try {
    cdp.proc.kill();
  } catch(e) {}
  console.log('✓ Diagnostic run completed.');
}

run().catch(console.error);
