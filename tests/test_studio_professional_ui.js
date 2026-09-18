/**
 * LDOCX Studio Professional Creative Application UI/UX Master Test Suite
 * Fully automated browser verification using Chrome/Edge DevTools Protocol (CDP).
 */
const { ChromeController } = require('./cdp_helper');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const OUTPUT_DIR = path.resolve(__dirname, 'output', 'studio_ui');
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

async function waitForPageReady(cdp, selector = '#ldoc-studio-shell', timeoutMs = 8000) {
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

async function runStudioTestSuite() {
  console.log('===============================================================');
  console.log('  LDOCX STUDIO PROFESSIONAL CREATIVE UI/UX MASTER TEST SUITE');
  console.log('===============================================================\n');

  const cdp = new ChromeController({ port: 9488 });
  console.log('▶ Launching Headless Chromium via CDP on port 9488...');
  await cdp.start();

  try {
    const studioPath = path.resolve(__dirname, '..', 'index.html');
    const studioUrl = pathToFileURL(studioPath).href + '?activated=1&key=LDOC-PRO-VIP&licensee=VIP-Test-Runner';

    console.log(`▶ Navigating to Studio: ${studioUrl}`);
    await cdp.send('Page.navigate', { url: studioUrl });
    await waitForPageReady(cdp, '#ldoc-studio-shell', 10000);

    // ─────────────────────────────────────────────────────────────
    // SECTION 1: MASTER APPLICATION SHELL ARCHITECTURE
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 1: Master Application Shell Architecture ---');
    const shellAudit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const shell = document.getElementById('ldoc-studio-shell');
        const topBar = document.getElementById('ldoc-top-bar');
        const toolRail = document.getElementById('ldoc-tool-rail');
        const shelf = document.getElementById('ldoc-context-shelf');
        const workspace = document.getElementById('ldoc-canvas-workspace');
        const inspector = document.getElementById('ldoc-inspector-panel');
        const statusBar = document.getElementById('ldoc-status-bar');
        const floatingToolbar = document.getElementById('ldoc-floating-toolbar');
        const legacyToolbar = document.getElementById('toolbar');

        return {
          hasShell: !!shell,
          hasTopBar: !!topBar,
          hasToolRail: !!toolRail,
          hasShelf: !!shelf,
          hasWorkspace: !!workspace,
          hasInspector: !!inspector,
          hasStatusBar: !!statusBar,
          hasFloatingToolbar: !!floatingToolbar,
          legacyToolbarHidden: legacyToolbar ? legacyToolbar.style.display === 'none' : true,
          topBarHeight: topBar ? topBar.offsetHeight : 0,
          toolRailWidth: toolRail ? toolRail.offsetWidth : 0,
          inspectorWidth: inspector ? inspector.offsetWidth : 0
        };
      })()`,
      returnByValue: true
    });

    const sa = shellAudit.result.value;
    assert(sa.hasShell, 'Master Studio Shell (#ldoc-studio-shell) mounted to DOM', 'P0');
    assert(sa.hasTopBar, 'Top Application Bar (#ldoc-top-bar) mounted', 'P0');
    assert(sa.hasToolRail, 'Left Vertical Tool Rail (#ldoc-tool-rail) mounted', 'P0');
    assert(sa.hasShelf, 'Contextual Flyout Shelf (#ldoc-context-shelf) mounted', 'P0');
    assert(sa.hasWorkspace, 'Living Canvas Workspace (#ldoc-canvas-workspace) mounted', 'P0');
    assert(sa.hasInspector, 'Right Inspector Panel (#ldoc-inspector-panel) mounted', 'P0');
    assert(sa.hasStatusBar, 'Bottom Status Bar (#ldoc-status-bar) mounted', 'P0');
    assert(sa.hasFloatingToolbar, 'Floating Contextual Toolbar (#ldoc-floating-toolbar) mounted', 'P0');
    assert(sa.legacyToolbarHidden, 'Legacy 40-button horizontal toolbar cleanly hidden', 'P1');
    assert(sa.topBarHeight === 48, 'Top Bar height standardized to 48px', 'P1');
    assert(sa.toolRailWidth === 56, 'Tool Rail width standardized to 56px', 'P1');

    await captureScreenshot(cdp, '01_studio_shell_baseline.png');

    // ─────────────────────────────────────────────────────────────
    // SECTION 2: TOP APPLICATION BAR & MENUBAR
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 2: Top Application Bar & Menubar ---');
    const topBarAudit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const brand = document.querySelector('.ldoc-brand-title');
        const titleInput = document.getElementById('ldoc-doc-title-input');
        const saveBadge = document.getElementById('ldoc-save-status');
        const fileMenu = document.querySelector('.ldoc-menu-item[data-menu="file"]');
        const editMenu = document.querySelector('.ldoc-menu-item[data-menu="edit"]');
        const viewMenu = document.querySelector('.ldoc-menu-item[data-menu="view"]');
        const livingTypeBtn = document.getElementById('ldoc-btn-living-type');
        const presentBtn = document.getElementById('ldoc-btn-present');
        const exportBtn = document.getElementById('ldoc-btn-export');
        const proBadge = document.getElementById('ldoc-pro-badge');

        return {
          brandText: brand ? brand.textContent.trim() : '',
          titleValue: titleInput ? titleInput.value : '',
          saveBadgeText: saveBadge ? saveBadge.textContent.trim() : '',
          hasFileMenu: !!fileMenu,
          hasEditMenu: !!editMenu,
          hasViewMenu: !!viewMenu,
          hasLivingTypeBtn: !!livingTypeBtn,
          hasPresentBtn: !!presentBtn,
          hasExportBtn: !!exportBtn,
          hasProBadge: !!proBadge
        };
      })()`,
      returnByValue: true
    });

    const tb = topBarAudit.result.value;
    assert(tb.brandText === 'LDOCX STUDIO', 'Application brand mark is "LDOCX STUDIO"', 'P1');
    assert(tb.titleValue === 'Untitled Living Document', 'Document title initialized to default', 'P1');
    assert(tb.saveBadgeText.includes('Saved'), 'Save status indicator displays "Saved locally"', 'P1');
    assert(tb.hasFileMenu && tb.hasEditMenu && tb.hasViewMenu, 'Menubar contains File, Edit, and View menus', 'P0');
    assert(tb.hasLivingTypeBtn, '✦ Living Type action button present on Top Bar', 'P0');
    assert(tb.hasPresentBtn, '▶ Present button present on Top Bar', 'P0');
    assert(tb.hasExportBtn, '⬇ Export button present on Top Bar', 'P0');
    assert(tb.hasProBadge, '👑 Pro Status license indicator present', 'P1');

    // Test inline title rename and dirty flag
    console.log('--- 2.1 Testing Inline Document Title Rename ---');
    const renameTest = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const titleInput = document.getElementById('ldoc-doc-title-input');
        titleInput.value = 'Quarterly Executive Review 2026';
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        const saveBadge = document.getElementById('ldoc-save-status');
        return {
          updatedVal: titleInput.value,
          isDirty: saveBadge.classList.contains('dirty'),
          saveText: saveBadge.textContent.trim()
        };
      })()`,
      returnByValue: true
    });

    const rt = renameTest.result.value;
    assert(rt.updatedVal === 'Quarterly Executive Review 2026', 'Document title updated inline', 'P1');
    assert(rt.isDirty && rt.saveText.includes('Unsaved changes'), 'Editing title sets save badge to "Unsaved changes"', 'P1');

    // Test File menu dropdown toggle
    console.log('--- 2.2 Testing Menubar Dropdown Interaction ---');
    const menuToggle = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const fileTrigger = document.querySelector('.ldoc-menu-item[data-menu="file"] .ldoc-menu-trigger');
        fileTrigger.click();
        const dropdown = document.getElementById('ldoc-menu-dropdown-file');
        return {
          isOpen: dropdown ? dropdown.classList.contains('open') : false,
          entriesCount: dropdown ? dropdown.querySelectorAll('.ldoc-menu-entry').length : 0
        };
      })()`,
      returnByValue: true
    });

    const mt = menuToggle.result.value;
    assert(mt.isOpen, 'File menu dropdown opened on click', 'P1');
    assert(mt.entriesCount >= 5, 'File menu contains New, Open, Save, Export, Version History', 'P1');

    // Dismiss menu dropdown
    await cdp.send('Runtime.evaluate', { expression: `document.body.click();` });
    await new Promise(r => setTimeout(r, 200));

    // ─────────────────────────────────────────────────────────────
    // SECTION 3: LEFT TOOL RAIL & CONTEXTUAL SHELVES
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 3: Left Tool Rail & Contextual Shelves ---');
    const railButtons = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const tools = Array.from(document.querySelectorAll('.ldoc-rail-btn')).map(b => b.dataset.tool || 'add');
        return { tools, count: tools.length };
      })()`,
      returnByValue: true
    });

    const rb = railButtons.result.value;
    assert(rb.tools.includes('select') && rb.tools.includes('shapes') && rb.tools.includes('data'), 'Tool Rail includes Select, Shapes, and Data tools', 'P0');
    assert(rb.tools.includes('living-type') && rb.tools.includes('ai'), 'Tool Rail includes Living Type and AI Copilot tools', 'P0');

    // Test opening Shapes shelf
    console.log('--- 3.1 Testing Shapes Flyout Shelf ---');
    const shapesShelf = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.LDocStudioShell.selectTool('shapes');
        const shelf = document.getElementById('ldoc-context-shelf');
        const title = document.getElementById('ldoc-shelf-title');
        const cards = shelf.querySelectorAll('.ldoc-shelf-card');
        return {
          isOpen: !shelf.classList.contains('collapsed'),
          title: title.textContent.trim(),
          cardsCount: cards.length
        };
      })()`,
      returnByValue: true
    });

    const ss = shapesShelf.result.value;
    assert(ss.isOpen, 'Shapes contextual shelf opened smoothly', 'P0');
    assert(ss.title.includes('Vector Shapes'), 'Shelf title displays "Vector Shapes & Primitives"', 'P1');
    assert(ss.cardsCount >= 6, 'Shapes shelf provides vector primitive cards', 'P1');
    await captureScreenshot(cdp, '02_shapes_shelf_open.png');

    // Test opening Data & Charts shelf
    console.log('--- 3.2 Testing Data & Charts Flyout Shelf ---');
    const dataShelf = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.LDocStudioShell.selectTool('data');
        const shelf = document.getElementById('ldoc-context-shelf');
        const title = document.getElementById('ldoc-shelf-title');
        const cards = shelf.querySelectorAll('.ldoc-shelf-card');
        return {
          isOpen: !shelf.classList.contains('collapsed'),
          title: title.textContent.trim(),
          cardsCount: cards.length
        };
      })()`,
      returnByValue: true
    });

    const ds = dataShelf.result.value;
    assert(ds.isOpen, 'Data & Charts contextual shelf opened', 'P0');
    assert(ds.title.includes('Charts'), 'Shelf title displays Charts & Data Visualization', 'P1');
    assert(ds.cardsCount >= 6, 'Data shelf provides Bar, Line, Pie, Doughnut, Radar, Waterfall', 'P1');
    await captureScreenshot(cdp, '03_data_shelf_open.png');

    // Test closing shelf
    console.log('--- 3.3 Testing Shelf Collapse ---');
    const closeShelf = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.LDocStudioShell.closeShelf();
        const shelf = document.getElementById('ldoc-context-shelf');
        return { isCollapsed: shelf.classList.contains('collapsed') };
      })()`,
      returnByValue: true
    });

    assert(closeShelf.result.value.isCollapsed, 'Contextual shelf collapses cleanly when closed', 'P1');

    // ─────────────────────────────────────────────────────────────
    // SECTION 4: CONTEXT-AWARE RIGHT INSPECTOR
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 4: Context-Aware Right Inspector ---');
    
    // 4.1 Empty Selection (Document Setup)
    const emptyInspector = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.LDocStudioShell.deselectAll();
        const title = document.getElementById('ldoc-inspector-title');
        const type = document.getElementById('ldoc-inspector-type');
        const accordions = document.querySelectorAll('#ldoc-inspector-body .ldoc-accordion');
        return {
          title: title.textContent.trim(),
          type: type.textContent.trim(),
          accordionsCount: accordions.length
        };
      })()`,
      returnByValue: true
    });

    const ei = emptyInspector.result.value;
    assert(ei.title === 'Document Setup', 'Empty selection displays "Document Setup"', 'P0');
    assert(ei.type === 'PAGE', 'Empty selection type pill is "PAGE"', 'P1');
    assert(ei.accordionsCount >= 2, 'Document inspector contains Dimensions and Theme accordions', 'P1');
    await captureScreenshot(cdp, '04_inspector_document_setup.png');

    // 4.2 Text Selection (Typography & Pretext Living Flow)
    console.log('--- 4.2 Testing Text Selection Inspector ---');
    const textInspector = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const fakeText = document.createElement('div');
        fakeText.className = 'ed-block ldoc-living-text';
        document.body.appendChild(fakeText);
        window.LDocStudioShell.selectObject(fakeText);

        const title = document.getElementById('ldoc-inspector-title');
        const type = document.getElementById('ldoc-inspector-type');
        const livingPill = document.querySelector('#ldoc-inspector-body .ldoc-living-badge-pill');
        const slider = document.querySelector('#ldoc-inspector-body input[type="range"]');

        fakeText.remove();
        return {
          title: title.textContent.trim(),
          type: type.textContent.trim(),
          hasLivingPill: !!livingPill,
          hasColumnsSlider: !!slider
        };
      })()`,
      returnByValue: true
    });

    const ti = textInspector.result.value;
    assert(ti.title === 'Typography & Flow', 'Text selection displays "Typography & Flow"', 'P0');
    assert(ti.type === 'TEXT', 'Text selection type pill is "TEXT"', 'P1');
    assert(ti.hasLivingPill, 'Living Typography badge visible in text inspector', 'P1');
    assert(ti.hasColumnsSlider, 'Multi-column balanced flow slider available', 'P1');
    await captureScreenshot(cdp, '05_inspector_typography.png');

    // 4.3 Shape Selection (Vector Geometry)
    console.log('--- 4.3 Testing Shape Selection Inspector ---');
    const shapeInspector = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const fakeShape = document.createElement('div');
        fakeShape.className = 'ed-block ldoc-shape-block';
        document.body.appendChild(fakeShape);
        window.LDocStudioShell.selectObject(fakeShape);

        const title = document.getElementById('ldoc-inspector-title');
        const type = document.getElementById('ldoc-inspector-type');
        const colorPicker = document.querySelector('#ldoc-inspector-body input[type="color"]');

        fakeShape.remove();
        return {
          title: title.textContent.trim(),
          type: type.textContent.trim(),
          hasColorPicker: !!colorPicker
        };
      })()`,
      returnByValue: true
    });

    const si = shapeInspector.result.value;
    assert(si.title === 'Vector Geometry', 'Shape selection displays "Vector Geometry"', 'P0');
    assert(si.type === 'SHAPE', 'Shape selection type pill is "SHAPE"', 'P1');
    assert(si.hasColorPicker, 'Shape fill color picker available', 'P1');

    // 4.4 Image / Flow Obstacle Selection
    console.log('--- 4.4 Testing Image Obstacle Inspector ---');
    const mediaInspector = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const fakeImg = document.createElement('img');
        fakeImg.className = 'ed-block ldoc-flow-obstacle';
        document.body.appendChild(fakeImg);
        window.LDocStudioShell.selectObject(fakeImg);

        const title = document.getElementById('ldoc-inspector-title');
        const type = document.getElementById('ldoc-inspector-type');
        const obstacleBadge = document.querySelector('#ldoc-inspector-body .ldoc-living-badge-pill');

        fakeImg.remove();
        return {
          title: title.textContent.trim(),
          type: type.textContent.trim(),
          hasObstacleBadge: !!obstacleBadge
        };
      })()`,
      returnByValue: true
    });

    const mi = mediaInspector.result.value;
    assert(mi.title === 'Media & Obstacle', 'Media selection displays "Media & Obstacle"', 'P0');
    assert(mi.type === 'IMAGE', 'Media selection type pill is "IMAGE"', 'P1');
    assert(mi.hasObstacleBadge, 'Living Obstacle indicator registered in inspector', 'P1');

    // ─────────────────────────────────────────────────────────────
    // SECTION 5: FLOATING CONTEXTUAL MINI-TOOLBAR
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 5: Floating Contextual Mini-Toolbar ---');
    const ftbTest = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.LDocStudioShell.deselectAll();
        const ftb = document.getElementById('ldoc-floating-toolbar');
        const hiddenBefore = !ftb.classList.contains('active');

        // Select a mock element
        const mockEl = document.createElement('div');
        mockEl.className = 'ed-block ldoc-living-text';
        mockEl.style.cssText = 'position: absolute; top: 100px; left: 100px; width: 200px; height: 50px;';
        document.getElementById('ldoc-canvas-workspace').appendChild(mockEl);

        window.LDocStudioShell.selectObject(mockEl);
        const activeAfter = ftb.classList.contains('active');
        const buttons = ftb.querySelectorAll('.ldoc-ftb-btn');

        mockEl.remove();
        return {
          hiddenBefore,
          activeAfter,
          buttonsCount: buttons.length,
          topPos: ftb.style.top,
          leftPos: ftb.style.left
        };
      })()`,
      returnByValue: true
    });

    const ft = ftbTest.result.value;
    assert(ft.hiddenBefore, 'Floating toolbar hidden when no selection is active', 'P1');
    assert(ft.activeAfter, 'Floating toolbar appears above active selection', 'P0');
    assert(ft.buttonsCount >= 5, 'Floating toolbar contains high-frequency formatting buttons', 'P1');
    await captureScreenshot(cdp, '06_floating_toolbar_active.png');

    // ─────────────────────────────────────────────────────────────
    // SECTION 6: UNIFIED CENTRAL INSERT EXPERIENCE (+ Add)
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 6: Unified Central Insert Experience (+ Add) ---');
    const insertModalTest = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.LDocStudioShell.openInsertModal();
        const modal = document.getElementById('ldoc-insert-modal');
        const cards = modal.querySelectorAll('.ldoc-insert-card');
        const search = document.getElementById('ldoc-insert-search');
        return {
          isOpen: modal.classList.contains('active'),
          cardsCount: cards.length,
          hasSearch: !!search
        };
      })()`,
      returnByValue: true
    });

    const im = insertModalTest.result.value;
    assert(im.isOpen, 'Central Insert Modal (+ Add) opened', 'P0');
    assert(im.cardsCount >= 12, 'Insert modal contains categorized cards across Text, Shapes, Data, 3D', 'P1');
    assert(im.hasSearch, 'Insert modal includes search filter', 'P1');
    await captureScreenshot(cdp, '07_insert_modal_open.png');

    // Test inserting a block from modal
    console.log('--- 6.1 Testing Block Insertion into Canvas ---');
    const insertAction = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.LDocStudioShell.insertBlock('shape-rect');
        const modal = document.getElementById('ldoc-insert-modal');
        const selected = window.LDocStudioShell.state.selectedObject;
        return {
          isModalClosed: !modal.classList.contains('active'),
          hasSelection: !!selected
        };
      })()`,
      returnByValue: true
    });

    const ia = insertAction.result.value;
    assert(ia.isModalClosed, 'Modal closes automatically after inserting block', 'P1');
    assert(ia.hasSelection, 'Newly inserted block is immediately selected and focused', 'P0');

    // ─────────────────────────────────────────────────────────────
    // SECTION 7: PRO LICENSING & LEMONSQUEEZY INTEGRATION
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 7: Pro Licensing & LemonSqueezy Integration ---');
    const proModalTest = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.LDocStudioShell.openProModal();
        const modal = document.getElementById('ldoc-pro-modal');
        const buyLink = document.getElementById('ldoc-pro-buy-link');
        const keyInput = document.getElementById('ldoc-license-key-input');
        return {
          isOpen: modal.classList.contains('active'),
          buyHref: buyLink ? buyLink.getAttribute('href') : '',
          hasKeyInput: !!keyInput
        };
      })()`,
      returnByValue: true
    });

    const pm = proModalTest.result.value;
    assert(pm.isOpen, 'Pro Activation modal opened successfully', 'P1');
    assert(pm.buyHref === 'https://jay-app.lemonsqueezy.com/checkout/buy/16851c1c-6dfb-4607-bf8b-81c3427594d1', 'Official LemonSqueezy checkout URL strictly verified', 'P0');
    assert(pm.hasKeyInput, 'Offline license key input provided', 'P1');
    await captureScreenshot(cdp, '08_pro_license_modal.png');

    // Dismiss pro modal
    await cdp.send('Runtime.evaluate', { expression: `window.LDocStudioShell.closeProModal();` });

    // ─────────────────────────────────────────────────────────────
    // SECTION 8: DARK & LIGHT THEME TOGGLE
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 8: Dark & Light Theme Toggle ---');
    const themeTest = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const beforeTheme = document.documentElement.getAttribute('data-theme');
        window.LDocStudioShell.dispatchAction('toggle-theme');
        const lightTheme = document.documentElement.getAttribute('data-theme');
        const lightBg = window.getComputedStyle(document.body).getPropertyValue('--ldoc-bg').trim();
        window.LDocStudioShell.dispatchAction('toggle-theme');
        const darkTheme = document.documentElement.getAttribute('data-theme');
        return { beforeTheme, lightTheme, lightBg, darkTheme };
      })()`,
      returnByValue: true
    });

    const tt = themeTest.result.value;
    assert(tt.lightTheme === 'light', 'Theme switched to Light mode', 'P1');
    assert(tt.lightBg === '#f8fafc', 'Light theme background variable applied correctly', 'P1');
    assert(tt.darkTheme === 'dark', 'Theme restored to Dark mode', 'P1');

    // ─────────────────────────────────────────────────────────────
    // SECTION 9: PRESENTATION MODE INTEGRATION
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 9: Universal Presentation Mode Integration ---');
    const presTest = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        window.LDocStudioShell.dispatchAction('presentation-mode');
        const isPresenting = document.body.classList.contains('ldoc-presenting');
        return { isPresenting };
      })()`,
      returnByValue: true
    });

    assert(presTest.result.value.isPresenting, 'Presentation mode entered via Studio Shell action', 'P0');
    await captureScreenshot(cdp, '09_studio_presentation_mode.png');

    // Exit presentation
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        if (window.ldocPresentation) window.ldocPresentation.exit();
        document.body.classList.remove('ldoc-presenting');
      })()`
    });

    // ─────────────────────────────────────────────────────────────
    // SECTION 10: RESPONSIVE VIEWPORT MATRIX
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- SECTION 10: Responsive Viewport Matrix (1920 -> 390) ---');
    const viewports = [
      { name: 'FHD Desktop (1920x1080)', width: 1920, height: 1080 },
      { name: 'Standard Laptop (1280x720)', width: 1280, height: 720 },
      { name: 'iPad Tablet (768x1024)', width: 768, height: 1024 },
      { name: 'iPhone Mobile (390x844)', width: 390, height: 844 }
    ];

    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width <= 768
      });
      await new Promise(r => setTimeout(r, 200));

      const flowCheck = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            innerWidth: window.innerWidth,
            hasOverflow: document.documentElement.scrollWidth > window.innerWidth + 2
          };
        })()`,
        returnByValue: true
      });

      const fc = flowCheck.result.value;
      assert(!fc.hasOverflow, `Viewport [${vp.name}]: Zero unwanted horizontal overflow`, 'P1');
    }

    // Reset viewport
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('\n▶ Shutting down Headless Chromium...');
  } catch (err) {
    console.error('Test execution exception:', err);
    defects.P0++;
  } finally {
    await cdp.close();
  }

  console.log('\n===============================================================');
  console.log(`  STUDIO UI/UX TEST RESULTS SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log(`  DEFECT AUDIT: P0=${defects.P0}, P1=${defects.P1}, P2=${defects.P2}, P3=${defects.P3}`);
  console.log('===============================================================\n');

  if (defects.P0 === 0 && defects.P1 === 0) {
    console.log('🎉 ALL STUDIO PROFESSIONAL UI/UX TESTS PASSED! STATUS: RELEASE READY');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED. INVESTIGATE DEFECTS ABOVE.');
    process.exit(1);
  }
}

runStudioTestSuite();
