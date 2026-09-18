/**
 * LDOCX Whole-Product UI/UX Visibility, Z-Index, Drawer, Modal & Interaction Master Test Suite
 * Fully automated browser verification using Chrome/Edge DevTools Protocol (CDP).
 */
const { ChromeController } = require('./cdp_helper');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, 'output', 'ui_visibility');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let passedTests = 0;
let totalTests = 0;
const defects = { P0: 0, P1: 0, P2: 0, P3: 0 };

function assert(condition, message, priority = 'P1') {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message} (Priority: ${priority})`);
    defects[priority]++;
  }
}

async function captureScreenshot(cdp, filename) {
  try {
    const res = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`    📸 Saved screenshot: ${filename}`);
  } catch (e) {
    console.warn(`    Failed to capture screenshot ${filename}:`, e.message);
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  LDOCX UI/UX VISIBILITY & INTERACTION MASTER TEST SUITE');
  console.log('===============================================================\n');

  const cdp = new ChromeController({ port: 9455 });
  console.log('▶ Launching Headless Chromium via CDP...');
  await cdp.start();

  try {
    const { pathToFileURL } = require('url');
    function resolveSurfacePath(filename) {
      let p = path.resolve(__dirname, '..', filename);
      if (!fs.existsSync(p)) {
        p = path.resolve(__dirname, '..', '..', 'local_ldoc studio pro', 'clone_ldoc', filename);
      }
      return p;
    }
    const creatorPath = resolveSurfacePath('creator.html');
    const studioPath = resolveSurfacePath('index.html');
    const creatorUrl = pathToFileURL(creatorPath).href;
    const studioUrl = pathToFileURL(studioPath).href + '?activated=1&key=LDOC-PRO-VIP&licensee=VIP-Test-Runner';
    console.log('Creator target:', creatorUrl);
    console.log('Studio target:', studioUrl);

    async function waitForPageReady(selector = '#ldoc-overlay-root', timeoutMs = 8000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try {
          const res = await cdp.send('Runtime.evaluate', {
            expression: `document.readyState === 'complete' && !!document.querySelector('${selector}')`,
            returnByValue: true
          });
          if (res.result && res.result.value === true) {
            await new Promise(r => setTimeout(r, 350));
            return true;
          }
        } catch (_) {}
        await new Promise(r => setTimeout(r, 200));
      }
      return false;
    }

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 1: CREATOR SURFACE (creator.html)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST SUITE 1: Creator Surface UI & Drawer Layering ---');
    await cdp.send('Page.navigate', { url: creatorUrl });
    await waitForPageReady('#ldoc-overlay-root', 6000);

    // 1.1 Baseline Health & Token Registration
    const tokenCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const cs = window.getComputedStyle(document.documentElement);
        const zBackdrop = cs.getPropertyValue('--z-drawer-backdrop').trim();
        const zContent = cs.getPropertyValue('--z-drawer-content').trim();
        const zModal = cs.getPropertyValue('--z-modal-content').trim();
        const zPres = cs.getPropertyValue('--z-presentation-hud').trim();
        return {
          zBackdrop: parseInt(zBackdrop, 10),
          zContent: parseInt(zContent, 10),
          zModal: parseInt(zModal, 10),
          zPres: parseInt(zPres, 10),
          hasOverlayRoot: !!document.getElementById('ldoc-overlay-root'),
          hasToastRoot: !!document.getElementById('ldoc-toast-root')
        };
      })()`,
      returnByValue: true
    });

    const tc = tokenCheck.result.value;
    assert(tc.zBackdrop === 800, 'Creator: --z-drawer-backdrop is standardized to 800', 'P0');
    assert(tc.zContent === 850, 'Creator: --z-drawer-content is standardized to 850', 'P0');
    assert(tc.zContent > tc.zBackdrop, 'Creator: Drawer Content (850) strictly exceeds Drawer Backdrop (800)', 'P0');
    assert(tc.zModal === 1050 && tc.zModal > tc.zContent, 'Creator: Modal Content (1050) strictly exceeds Drawer Content (850)', 'P0');
    assert(tc.hasOverlayRoot, 'Creator: #ldoc-overlay-root mounted directly to document body', 'P1');
    assert(tc.hasToastRoot, 'Creator: #ldoc-toast-root mounted for non-blocking notifications', 'P1');

    await captureScreenshot(cdp, 'creator_normal.png');

    // 1.2 FX Wizard Drawer & Backdrop Occlusion Test
    console.log('\n--- 1.2 Testing FX Wizard Sidebar Hit Testing & Occlusion ---');
    await cdp.send('Runtime.evaluate', { expression: 'toggleFxWizard();' });
    await new Promise(r => setTimeout(r, 450));

    const fxHit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const fx = document.getElementById('fx-wizard-sidebar');
        const backdrop = document.getElementById('drawer-backdrop');
        const rect = fx.getBoundingClientRect();
        const ptX = rect.left + rect.width / 2;
        const ptY = rect.top + 70;
        const topEl = document.elementFromPoint(ptX, ptY);
        return {
          fxOpen: fx.classList.contains('open'),
          backdropActive: backdrop.classList.contains('active'),
          topElTag: topEl ? topEl.tagName : null,
          topElId: topEl ? topEl.id : null,
          isInsideFx: fx.contains(topEl),
          isOccludedByBackdrop: topEl === backdrop
        };
      })()`,
      returnByValue: true
    });

    const fh = fxHit.result.value;
    assert(fh.fxOpen, 'Creator: FX Wizard toggled open', 'P1');
    assert(fh.backdropActive, 'Creator: Drawer backdrop is active behind FX Wizard', 'P1');
    assert(!fh.isOccludedByBackdrop, 'Creator: Drawer backdrop does NOT cover FX Wizard', 'P0');
    assert(fh.isInsideFx, 'Creator: Top hit element at FX Wizard coordinates is inside FX Wizard', 'P0');

    await captureScreenshot(cdp, 'creator_fx_wizard_open.png');

    // 1.3 Popup Elements Palette Modal Hit Test
    console.log('\n--- 1.3 Testing Elements Palette Modal Stacking & Hit Test ---');
    await cdp.send('Runtime.evaluate', { expression: 'toggleElementsPopup();' });
    await new Promise(r => setTimeout(r, 400));

    const modalHit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.getElementById('popup-elements-modal');
        const rect = modal.getBoundingClientRect();
        const ptX = rect.left + rect.width / 2;
        const ptY = rect.top + 50;
        const topEl = document.elementFromPoint(ptX, ptY);
        return {
          modalOpen: modal.classList.contains('open'),
          isInsideModal: modal.contains(topEl),
          modalZIndex: parseInt(window.getComputedStyle(modal).zIndex, 10)
        };
      })()`,
      returnByValue: true
    });

    const mh = modalHit.result.value;
    assert(mh.modalOpen, 'Creator: Elements palette modal opened', 'P1');
    assert(mh.isInsideModal, 'Creator: Elements palette modal is topmost clickable element', 'P0');
    assert(mh.modalZIndex === 1050, 'Creator: Elements palette modal z-index is 1050 (above drawers & backdrop)', 'P0');

    await captureScreenshot(cdp, 'creator_elements_modal_open.png');

    // 1.4 Close All Drawers Test
    console.log('\n--- 1.4 Testing Backdrop Dismissal & Close All ---');
    await cdp.send('Runtime.evaluate', { expression: 'closeAllDrawers();' });
    await new Promise(r => setTimeout(r, 300));

    const closedCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const fx = document.getElementById('fx-wizard-sidebar');
        const modal = document.getElementById('popup-elements-modal');
        const backdrop = document.getElementById('drawer-backdrop');
        return {
          fxClosed: !fx.classList.contains('open'),
          modalClosed: !modal.classList.contains('open'),
          backdropInactive: !backdrop.classList.contains('active')
        };
      })()`,
      returnByValue: true
    });

    const cc = closedCheck.result.value;
    assert(cc.fxClosed && cc.modalClosed, 'Creator: All drawers and modals closed', 'P1');
    assert(cc.backdropInactive, 'Creator: Drawer backdrop successfully deactivated', 'P1');

    // 1.5 Presentation Mode in Creator
    console.log('\n--- 1.5 Testing Universal Presentation Mode in Creator ---');
    await cdp.send('Runtime.evaluate', { expression: 'window.ldocPresentation.enter();' });
    await new Promise(r => setTimeout(r, 500));

    const presHit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const controls = document.getElementById('ldoc-pres-controls');
        const exitBtn = document.getElementById('ldoc-btn-exit');
        const fitBtn = document.getElementById('ldoc-btn-fit');
        const eRect = exitBtn.getBoundingClientRect();
        const topElExit = document.elementFromPoint(eRect.left + eRect.width / 2, eRect.top + eRect.height / 2);
        return {
          isPresenting: document.body.classList.contains('ldoc-presenting'),
          controlsZIndex: parseInt(window.getComputedStyle(controls).zIndex, 10),
          exitClickable: topElExit === exitBtn || exitBtn.contains(topElExit)
        };
      })()`,
      returnByValue: true
    });

    const ph = presHit.result.value;
    assert(ph.isPresenting, 'Creator: Presentation mode entered', 'P0');
    assert(ph.controlsZIndex === 1400, 'Creator: Presentation controls z-index is 1400 (--z-presentation-hud)', 'P0');
    assert(ph.exitClickable, 'Creator: Exit presentation button is clickable above all content', 'P0');

    await captureScreenshot(cdp, 'creator_presentation_mode.png');

    // Exit presentation mode
    await cdp.send('Runtime.evaluate', { expression: 'window.ldocPresentation.exit();' });
    await new Promise(r => setTimeout(r, 300));


    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 2: STUDIO SURFACE (index.html)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST SUITE 2: Studio Surface UI, Stacking & Drawers ---');
    await cdp.navigate(studioUrl);
    await new Promise(r => setTimeout(r, 1500));

    await captureScreenshot(cdp, 'studio_normal.png');

    // 2.1 Pages Drawer Hoisting & Hit Test
    console.log('\n--- 2.1 Testing Studio Pages Drawer (Hoisted to Root) ---');
    await cdp.send('Runtime.evaluate', { expression: 'togglePagesPanel();' });
    await new Promise(r => setTimeout(r, 450));

    const pagesHit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const overlay = document.getElementById('pages-overlay');
        const panel = document.getElementById('pages-panel');
        const pRect = panel.getBoundingClientRect();
        const topEl = document.elementFromPoint(pRect.left + 60, pRect.top + 80);
        return {
          overlayParent: overlay.parentElement.tagName,
          isInsideMain: document.getElementById('main').contains(overlay),
          overlayZIndex: parseInt(window.getComputedStyle(overlay).zIndex, 10),
          panelZIndex: parseInt(window.getComputedStyle(panel).zIndex, 10),
          isInsidePanel: panel.contains(topEl)
        };
      })()`,
      returnByValue: true
    });

    const pgh = pagesHit.result.value;
    assert(pgh.overlayParent === 'BODY', 'Studio: Pages overlay parent is direct BODY (zero stacking-context trap)', 'P0');
    assert(!pgh.isInsideMain, 'Studio: Pages overlay is NOT trapped inside #main container', 'P0');
    assert(pgh.overlayZIndex === 800, 'Studio: Pages overlay backdrop z-index is 800', 'P1');
    assert(pgh.panelZIndex === 850, 'Studio: Pages drawer panel z-index is 850 (above backdrop)', 'P0');
    assert(pgh.isInsidePanel, 'Studio: Hit element inside pages panel is interactive child (not blocked)', 'P0');

    await captureScreenshot(cdp, 'studio_pages_drawer_open.png');

    await cdp.send('Runtime.evaluate', { expression: 'closePagesPanel();' });
    await new Promise(r => setTimeout(r, 300));

    // 2.2 Help Drawer & Dedicated Backdrop
    console.log('\n--- 2.2 Testing Studio Help Drawer & Backdrop ---');
    await cdp.send('Runtime.evaluate', { expression: 'toggleHelpDrawer();' });
    await new Promise(r => setTimeout(r, 450));

    const helpHit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const drawer = document.getElementById('help-drawer');
        const backdrop = document.getElementById('help-drawer-backdrop');
        const rect = drawer.getBoundingClientRect();
        const topEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 60);
        return {
          drawerShown: drawer.style.display === 'flex',
          backdropActive: backdrop ? backdrop.classList.contains('active') : false,
          drawerZIndex: parseInt(window.getComputedStyle(drawer).zIndex, 10),
          backdropZIndex: backdrop ? parseInt(window.getComputedStyle(backdrop).zIndex, 10) : null,
          isInsideDrawer: drawer.contains(topEl)
        };
      })()`,
      returnByValue: true
    });

    const hh = helpHit.result.value;
    assert(hh.drawerShown, 'Studio: Help drawer opened (F1)', 'P1');
    assert(hh.backdropActive, 'Studio: Help drawer backdrop is active', 'P1');
    assert(hh.drawerZIndex === 850, 'Studio: Help drawer z-index is 850', 'P0');
    assert(hh.backdropZIndex === 800, 'Studio: Help drawer backdrop z-index is 800 (below drawer)', 'P0');
    assert(hh.isInsideDrawer, 'Studio: Hit element on Help drawer coordinates is inside drawer', 'P0');

    await captureScreenshot(cdp, 'studio_help_drawer_open.png');

    await cdp.send('Runtime.evaluate', { expression: 'toggleHelpDrawer();' });
    await new Promise(r => setTimeout(r, 300));

    // 2.3 Spotlight Command Palette Hit Test
    console.log('\n--- 2.3 Testing Spotlight Command Palette (1100 Layer) ---');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        if (window.LDocModals && typeof window.LDocModals.showCommandPalette === 'function') {
          window.LDocModals.showCommandPalette();
        }
      })()`
    });
    await new Promise(r => setTimeout(r, 450));

    const palHit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.getElementById('ldoc-command-palette-modal');
        if (!modal) return { hasModal: false };
        const box = modal.querySelector('.ldoc-cloud-modal-box');
        const rect = box.getBoundingClientRect();
        const topEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 20);
        return {
          hasModal: true,
          modalActive: modal.classList.contains('active'),
          boxInside: box.contains(topEl),
          modalZIndex: parseInt(window.getComputedStyle(modal).zIndex, 10)
        };
      })()`,
      returnByValue: true
    });

    const ph2 = palHit.result.value;
    assert(ph2.hasModal && ph2.modalActive, 'Studio: Command palette opened via LDocModals', 'P1');
    assert(ph2.boxInside, 'Studio: Command palette input is topmost hit element', 'P0');

    await captureScreenshot(cdp, 'studio_command_palette_open.png');

    // Dismiss command palette via Escape
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const m = document.getElementById('ldoc-command-palette-modal');
        if (m) m.classList.remove('active');
      })()`
    });
    await new Promise(r => setTimeout(r, 300));


    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 3: LIVE STUDIO SURFACE (live-studio.html)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST SUITE 3: Live Studio Stacking & Drawer Layering ---');
    const liveStudioPath = resolveSurfacePath('live-studio.html');
    const liveStudioUrl = pathToFileURL(liveStudioPath).href;
    await cdp.send('Page.navigate', { url: liveStudioUrl });
    await waitForPageReady('#ldoc-overlay-root', 8000);

    // Dismiss auto-popup comparison and pro features promo modals
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        if (typeof closeNoteupModal === 'function') closeNoteupModal();
        if (typeof closeProFeaturesModal === 'function') closeProFeaturesModal();
        const pfm = document.getElementById('pro-features-modal');
        if (pfm) pfm.style.display = 'none';
        const noteup = document.getElementById('demo-noteup-modal');
        if (noteup) noteup.classList.remove('active');
      })()`
    });
    await new Promise(r => setTimeout(r, 400));

    const lsTokens = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const cs = window.getComputedStyle(document.documentElement);
        return {
          zBackdrop: parseInt(cs.getPropertyValue('--z-drawer-backdrop').trim(), 10),
          zContent: parseInt(cs.getPropertyValue('--z-drawer-content').trim(), 10),
          hasOverlayRoot: !!document.getElementById('ldoc-overlay-root')
        };
      })()`,
      returnByValue: true
    });
    const lst = lsTokens.result.value;
    assert(lst.zBackdrop === 800, 'Live Studio: --z-drawer-backdrop is standardized to 800', 'P0');
    assert(lst.zContent === 850, 'Live Studio: --z-drawer-content is standardized to 850', 'P0');
    assert(lst.hasOverlayRoot, 'Live Studio: #ldoc-overlay-root mounted directly to document body', 'P1');
    await captureScreenshot(cdp, 'live_studio_normal.png');

    // 3.1 Live Studio Pages Drawer
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const pfm = document.getElementById('pro-features-modal');
        if (pfm) pfm.remove();
        const noteup = document.getElementById('demo-noteup-modal');
        if (noteup) noteup.remove();
        if (typeof togglePagesPanel === "function") togglePagesPanel();
      })()`
    });
    await new Promise(r => setTimeout(r, 450));
    const lsPages = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const overlay = document.getElementById('pages-overlay');
        const panel = document.getElementById('pages-panel');
        if (!overlay || !panel) return { exists: false };
        const rect = panel.getBoundingClientRect();
        const topEl = document.elementFromPoint(rect.left + 50, rect.top + 70);
        return {
          exists: true,
          isOpen: overlay.classList.contains('open'),
          overlayZIndex: parseInt(window.getComputedStyle(overlay).zIndex, 10),
          panelZIndex: parseInt(window.getComputedStyle(panel).zIndex, 10),
          isInsidePanel: panel.contains(topEl),
          topElTag: topEl ? topEl.tagName : null,
          topElId: topEl ? topEl.id : null,
          topElClass: topEl ? topEl.className : null
        };
      })()`,
      returnByValue: true
    });
    const lsp = lsPages.result.value;
    console.log('DEBUG Live Studio Hit:', lsp);
    if (lsp.exists) {
      assert(lsp.isOpen, 'Live Studio: Pages drawer opened', 'P1');
      assert(lsp.overlayZIndex === 800, 'Live Studio: Pages overlay backdrop z-index is 800', 'P0');
      assert(lsp.panelZIndex === 850, 'Live Studio: Pages drawer panel z-index is 850', 'P0');
      assert(lsp.isInsidePanel, 'Live Studio: Element inside drawer panel is topmost hit element', 'P0');
    }
    await captureScreenshot(cdp, 'live_studio_pages_open.png');
    await cdp.send('Runtime.evaluate', { expression: 'if (typeof closePagesPanel === "function") closePagesPanel();' });
    await new Promise(r => setTimeout(r, 300));


    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 4: STANDALONE VIEWER SURFACE (viewer.html)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST SUITE 4: Standalone Viewer & Presentation Stacking ---');
    const viewerPath = resolveSurfacePath('viewer.html');
    const viewerUrl = pathToFileURL(viewerPath).href;
    await cdp.send('Page.navigate', { url: viewerUrl });
    await waitForPageReady('#ldoc-overlay-root', 6000);

    const vTokens = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const cs = window.getComputedStyle(document.documentElement);
        return {
          zPres: parseInt(cs.getPropertyValue('--z-presentation-hud').trim(), 10),
          hasOverlayRoot: !!document.getElementById('ldoc-overlay-root')
        };
      })()`,
      returnByValue: true
    });
    const vt = vTokens.result.value;
    assert(vt.zPres === 1400, 'Viewer: --z-presentation-hud standardized to 1400', 'P0');
    assert(vt.hasOverlayRoot, 'Viewer: #ldoc-overlay-root mounted directly to document body', 'P1');
    await captureScreenshot(cdp, 'viewer_normal.png');

    // 4.1 Viewer Presentation Mode Test
    console.log('--- 4.1 Testing Presentation Mode in Standalone Viewer ---');
    await cdp.send('Runtime.evaluate', { expression: 'if (window.ldocPresentation) window.ldocPresentation.enter();' });
    await new Promise(r => setTimeout(r, 450));
    const vPresHit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const controls = document.getElementById('ldoc-pres-controls');
        const exitBtn = document.getElementById('ldoc-btn-exit');
        if (!controls || !exitBtn) return { hasControls: false };
        const rect = exitBtn.getBoundingClientRect();
        const topEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
          hasControls: true,
          isPresenting: document.body.classList.contains('ldoc-presenting'),
          controlsZIndex: parseInt(window.getComputedStyle(controls).zIndex, 10),
          exitClickable: topEl === exitBtn || exitBtn.contains(topEl)
        };
      })()`,
      returnByValue: true
    });
    const vph = vPresHit.result.value;
    if (vph.hasControls) {
      assert(vph.isPresenting, 'Viewer: Presentation mode successfully active', 'P0');
      assert(vph.controlsZIndex === 1400, 'Viewer: Presentation HUD z-index is 1400', 'P0');
      assert(vph.exitClickable, 'Viewer: Exit presentation button is top hit element and clickable', 'P0');
    }
    await captureScreenshot(cdp, 'viewer_presentation_mode.png');
    await cdp.send('Runtime.evaluate', { expression: 'if (window.ldocPresentation) window.ldocPresentation.exit();' });
    await new Promise(r => setTimeout(r, 300));


    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 5: TEMPLATES HUB SURFACE (templates.html)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST SUITE 5: Templates Hub Layer Tokens & Root Verification ---');
    const templatesPath = resolveSurfacePath('templates.html');
    const templatesUrl = pathToFileURL(templatesPath).href;
    await cdp.send('Page.navigate', { url: templatesUrl });
    await waitForPageReady('#ldoc-overlay-root', 6000);

    const tplTokens = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const cs = window.getComputedStyle(document.documentElement);
        return {
          zBackdrop: parseInt(cs.getPropertyValue('--z-drawer-backdrop').trim(), 10),
          zModal: parseInt(cs.getPropertyValue('--z-modal-content').trim(), 10),
          hasOverlayRoot: !!document.getElementById('ldoc-overlay-root'),
          hasToastRoot: !!document.getElementById('ldoc-toast-root')
        };
      })()`,
      returnByValue: true
    });
    const tplt = tplTokens.result.value;
    assert(tplt.zBackdrop === 800, 'Templates: --z-drawer-backdrop is standardized to 800', 'P1');
    assert(tplt.zModal === 1050, 'Templates: --z-modal-content is standardized to 1050', 'P1');
    assert(tplt.hasOverlayRoot, 'Templates: #ldoc-overlay-root mounted directly to document body', 'P1');
    assert(tplt.hasToastRoot, 'Templates: #ldoc-toast-root mounted for notifications', 'P1');
    await captureScreenshot(cdp, 'templates_hub_normal.png');


    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 6: MULTI-VIEWPORT RESPONSIVENESS & TOUCH TARGETS
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- TEST SUITE 6: Viewport Matrix & Touch Target Verification ---');
    const viewports = [
      { name: 'FHD Desktop', width: 1920, height: 1080 },
      { name: 'Standard Laptop', width: 1280, height: 720 },
      { name: 'iPad Portrait', width: 768, height: 1024 },
      { name: 'iPhone 15 Mobile', width: 390, height: 844 }
    ];

    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width <= 768
      });
      await new Promise(r => setTimeout(r, 200));

      const vpCheck = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          return {
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2
          };
        })()`,
        returnByValue: true
      });

      const vc = vpCheck.result.value;
      assert(!vc.hasHorizontalOverflow, `Viewport [${vp.name} (${vp.width}x${vp.height})]: Zero unwanted horizontal overflow`, 'P2');
    }

    // Reset viewport
    await cdp.send('Emulation.clearDeviceMetricsOverride');

  } catch (err) {
    console.error('Test execution exception:', err);
    defects.P0++;
  } finally {
    await cdp.stop();
  }

  console.log('\n===============================================================');
  console.log(`  TEST RESULTS SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log(`  DEFECT AUDIT: P0=${defects.P0}, P1=${defects.P1}, P2=${defects.P2}, P3=${defects.P3}`);
  console.log('===============================================================\n');

  const allPassed = (defects.P0 === 0 && defects.P1 === 0 && defects.P2 === 0);
  if (allPassed) {
    console.log('🎉 ALL UI/UX VISIBILITY & INTERACTION TESTS PASSED! STATUS: UI RELEASE READY');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. INVESTIGATE DEFECTS ABOVE.');
    process.exit(1);
  }
}

runTestSuite();
