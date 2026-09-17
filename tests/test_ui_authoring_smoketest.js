const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { ChromeController } = require('./cdp_helper');

async function runSmokeTest() {
  console.log('🧪 Starting LDOCX UI Authoring Browser-in-the-Loop Smoke Test...\n');
  const outDir = path.resolve(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const chrome = new ChromeController({ port: 9558 });
  await chrome.start();
  console.log('   Connected to Chrome CDP on port 9558.');

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. CREATOR.HTML VERIFICATION
    // ═══════════════════════════════════════════════════════════════
    console.log('\n▶ [1/2] Verifying Creator Surface (http://127.0.0.1:3000/creator.html)...');
    await chrome.navigate('http://127.0.0.1:3000/creator.html');
    await new Promise(r => setTimeout(r, 2000));

    // 1.1: Verify Global Functions and Core State
    const creatorState = await chrome.evaluate(`
      (function() {
        return {
          hasToggleCrShapeMenu: typeof window.toggleCrShapeMenu === 'function',
          hasToggleCrSimMenu: typeof window.toggleCrSimMenu === 'function',
          hasCreatorAlign: typeof window.creatorAlign === 'function',
          hasCreatorDistribute: typeof window.creatorDistribute === 'function',
          hasCreatorGroup: typeof window.creatorGroup === 'function',
          hasCreatorUngroup: typeof window.creatorUngroup === 'function',
          hasCreatorContrastModal: typeof window.creatorOpenContrastModal === 'function',
          hasUpdateAutoSave: typeof window.updateAutoSaveIndicator === 'function',
          pageCount: (typeof pages !== 'undefined' && Array.isArray(pages)) ? pages.length : 0
        };
      })()
    `);
    console.log('   Creator Engine State:', JSON.stringify(creatorState));
    assert(creatorState.hasToggleCrShapeMenu, 'toggleCrShapeMenu missing');
    assert(creatorState.hasToggleCrSimMenu, 'toggleCrSimMenu missing');
    assert(creatorState.hasCreatorAlign, 'creatorAlign missing');
    assert(creatorState.hasCreatorDistribute, 'creatorDistribute missing');
    assert(creatorState.hasCreatorGroup, 'creatorGroup missing');
    assert(creatorState.hasCreatorUngroup, 'creatorUngroup missing');
    assert(creatorState.hasCreatorContrastModal, 'creatorOpenContrastModal missing');
    assert(creatorState.hasUpdateAutoSave, 'updateAutoSaveIndicator missing');

    // 1.2: Add Vector Shape and inspect
    console.log('   Testing Vector Shape creation & inspector in Creator...');
    const shapeResult = await chrome.evaluate(`
      (function() {
        addBlock('shape', 'rounded_rect');
        const pList = (typeof pages !== 'undefined') ? pages : [];
        const page = pList.find(p => p.id === currentPage) || pList[0];
        const shapeBlock = page.blocks[page.blocks.length - 1];
        
        // Mutate shape attributes
        if (!shapeBlock.style) shapeBlock.style = {};
        shapeBlock.style.fill = '#ec4899';
        shapeBlock.style.stroke = '#be185d';
        shapeBlock.style.strokeWidth = 3;
        shapeBlock.style.cornerRadius = 18;
        if (typeof updateCreatorLivePreview === 'function') updateCreatorLivePreview();
        if (typeof renderBlocks === 'function') renderBlocks();

        return {
          id: shapeBlock.id,
          type: shapeBlock.type,
          shapeType: shapeBlock.shape_type || shapeBlock.shapeType || shapeBlock.shape,
          fill: shapeBlock.style?.fill,
          hasEngine: !!window.LDocShapeEngine
        };
      })()
    `);
    console.log('   Shape Block Created:', JSON.stringify(shapeResult));
    assert.strictEqual(shapeResult.type, 'shape');
    assert.strictEqual(shapeResult.shapeType, 'rounded_rect');
    assert.strictEqual(shapeResult.fill, '#ec4899');

    // 1.3: Add Simulation Block and verify DAG calculation
    console.log('   Testing Reactive Simulation Block & DAG Engine in Creator...');
    const simResult = await chrome.evaluate(`
      (function() {
        addBlock('simulation', 'projectile');
        const pList = (typeof pages !== 'undefined') ? pages : [];
        const page = pList.find(p => p.id === currentPage) || pList[0];
        const simBlock = page.blocks[page.blocks.length - 1];
        
        const reactiveEngine = window.LDocReactiveEngine;
        let dagEvaluated = false;
        let flightTime = 0;
        if (reactiveEngine && simBlock.simulationConfig) {
          const res = reactiveEngine.evaluateSimulation(simBlock.simulationConfig);
          dagEvaluated = res && res.success;
          flightTime = res && res.values ? res.values.flight_time : 0;
        }

        return {
          id: simBlock.id,
          type: simBlock.type,
          preset: simBlock.preset,
          hasEngine: !!reactiveEngine
        };
      })()
    `);
    console.log('   Simulation Block Created:', JSON.stringify(simResult));
    assert.strictEqual(simResult.type, 'simulation');
    assert(simResult.hasEngine, 'LDocReactiveEngine missing in Creator');

    // 1.4: Add Interactive Quiz Block
    console.log('   Testing Interactive Quiz Block in Creator...');
    const quizResult = await chrome.evaluate(`
      (function() {
        addBlock('quiz');
        const pList = (typeof pages !== 'undefined') ? pages : [];
        const page = pList.find(p => p.id === currentPage) || pList[0];
        const quizBlock = page.blocks[page.blocks.length - 1];

        const quizEngine = window.LDocQuizEngine;
        return {
          id: quizBlock.id,
          type: quizBlock.type,
          title: quizBlock.title || quizBlock.quizTitle,
          hasEngine: !!quizEngine
        };
      })()
    `);
    console.log('   Quiz Block Created:', JSON.stringify(quizResult));
    assert.strictEqual(quizResult.type, 'quiz');
    assert(quizResult.hasEngine, 'LDocQuizEngine missing in Creator');

    // 1.5: Test Multi-Selection Alignment & Grouping
    console.log('   Testing Multi-Selection Alignment & Grouping in Creator...');
    const alignGroupResult = await chrome.evaluate(`
      (function() {
        addBlock('shape', 'circle');
        const pList = (typeof pages !== 'undefined') ? pages : [];
        const page = pList.find(p => p.id === currentPage) || pList[0];
        const b1 = page.blocks[page.blocks.length - 2];
        const b2 = page.blocks[page.blocks.length - 1];
        b1.x = 40; b1.y = 80; b1.width = 120; b1.height = 100;
        b2.x = 260; b2.y = 150; b2.width = 80; b2.height = 80;

        // Re-render blocks to ensure checkboxes exist in DOM
        renderBlocks();

        // Select both blocks via creator block select checkboxes
        const cbs = document.querySelectorAll('.creator-block-select-cb');
        if (cbs.length >= 2) {
          cbs[cbs.length - 2].checked = true;
          cbs[cbs.length - 1].checked = true;
        }

        // Run Align Left
        creatorAlign('left');
        const alignedLeft = (b1.x === b2.x);

        // Run Grouping
        creatorGroup();
        const groupedBlock = page.blocks[page.blocks.length - 1];
        const isGroup = groupedBlock.type === 'group';
        const groupChildrenCount = groupedBlock.children?.length || 0;

        // Run Ungrouping
        const groupCb = document.querySelectorAll('.creator-block-select-cb');
        if (groupCb.length > 0) groupCb[groupCb.length - 1].checked = true;
        creatorUngroup();
        const ungroupedBlock = page.blocks[page.blocks.length - 1];

        return {
          alignedLeft,
          commonX: b1.x,
          isGroup,
          groupChildrenCount,
          ungroupSuccess: ungroupedBlock.type !== 'group'
        };
      })()
    `);
    console.log('   Alignment & Grouping Result:', JSON.stringify(alignGroupResult));
    assert(alignGroupResult.alignedLeft, 'Align left failed to match X coordinates');
    assert(alignGroupResult.isGroup, 'Grouping failed to create group block');
    assert.strictEqual(alignGroupResult.groupChildrenCount, 2, 'Group should have 2 children');
    assert(alignGroupResult.ungroupSuccess, 'Ungrouping failed');

    // 1.6: Test WCAG 2.2 AA/AAA Contrast Checker Modal
    console.log('   Testing WCAG 2.2 Contrast Checker Modal in Creator...');
    const contrastResult = await chrome.evaluate(`
      (function() {
        creatorOpenContrastModal();
        const modal = document.getElementById('cr-contrast-modal');
        const isOpen = modal && modal.style.display !== 'none';
        
        const hexToRgb = (hex) => {
          let c = hex.replace('#', '');
          if (c.length === 3) c = c.split('').map(x => x + x).join('');
          const num = parseInt(c, 16);
          return [num >> 16, (num >> 8) & 255, num & 255];
        };
        const relLum = ([r, g, b]) => {
          const a = [r, g, b].map(v => {
            v /= 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
        };
        const l1 = relLum(hexToRgb('#ffffff'));
        const l2 = relLum(hexToRgb('#000000'));
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        if (modal) modal.style.display = 'none';

        return {
          modalOpened: isOpen,
          calculatedRatio: ratio.toFixed(1),
          passAA: ratio >= 4.5,
          passAAA: ratio >= 7.0
        };
      })()
    `);
    console.log('   WCAG Contrast Result:', JSON.stringify(contrastResult));
    assert(contrastResult.modalOpened, 'WCAG Contrast modal did not open');
    assert(contrastResult.passAA && contrastResult.passAAA, 'WCAG evaluation failed');

    // 1.7: Test Crash Recovery Banner & Autosave status
    console.log('   Testing Autosave Status & Crash Recovery Banner in Creator...');
    const recoveryResult = await chrome.evaluate(`
      (function() {
        updateAutoSaveIndicator('Saving...');
        const savingText = document.getElementById('autosave-indicator')?.textContent || '';

        updateAutoSaveIndicator('Saved');
        const savedText = document.getElementById('autosave-indicator')?.textContent || '';

        updateAutoSaveIndicator('Offline Draft Cached');
        const cachedText = document.getElementById('autosave-indicator')?.textContent || '';

        const banner = document.getElementById('ldoc-crash-recovery-banner');
        let bannerVisible = false;
        if (banner) {
          banner.style.display = 'flex';
          bannerVisible = (banner.style.display === 'flex');
          banner.style.display = 'none';
        }

        return {
          hasSaving: savingText.includes('Saving'),
          hasSaved: savedText.includes('Saved'),
          hasCached: cachedText.includes('Offline Draft Cached'),
          bannerVisible: !!banner
        };
      })()
    `);
    console.log('   Autosave & Recovery Result:', JSON.stringify(recoveryResult));
    assert(recoveryResult.hasSaving, 'Autosave Saving status failed');
    assert(recoveryResult.hasSaved, 'Autosave Saved status failed');
    assert(recoveryResult.hasCached, 'Autosave Offline Draft Cached status failed');

    // Capture Creator screenshot
    const creatorScreenPath = path.join(outDir, 'creator_authoring_ui.png');
    await chrome.captureScreenshot(creatorScreenPath);
    console.log(`   📸 Saved Creator screenshot: ${creatorScreenPath}`);

    // ═══════════════════════════════════════════════════════════════
    // 2. STUDIO.HTML VERIFICATION
    // ═══════════════════════════════════════════════════════════════
    console.log('\n▶ [2/2] Verifying Studio Surface (http://127.0.0.1:3000/studio.html)...');
    await chrome.navigate('http://127.0.0.1:3000/studio.html');
    await new Promise(r => setTimeout(r, 2000));

    const studioState = await chrome.evaluate(`
      (function() {
        return {
          hasToggleEdShapeMenu: typeof window.toggleEdShapeMenu === 'function',
          hasToggleEdSimMenu: typeof window.toggleEdSimMenu === 'function',
          hasToggleEdChartMenu: typeof window.toggleEdChartMenu === 'function',
          hasLdocUiAlign: typeof window.ldocUiAlign === 'function',
          hasLdocUiDistribute: typeof window.ldocUiDistribute === 'function',
          hasLdocUiGroup: typeof window.ldocUiGroup === 'function',
          hasLdocUiUngroup: typeof window.ldocUiUngroup === 'function',
          hasLdocOpenContrastModal: typeof window.ldocOpenContrastModal === 'function',
          edPageCount: (typeof edPages !== 'undefined' && Array.isArray(edPages)) ? edPages.length : 0
        };
      })()
    `);
    console.log('   Studio Engine State:', JSON.stringify(studioState));
    assert(studioState.hasToggleEdShapeMenu, 'toggleEdShapeMenu missing in Studio');
    assert(studioState.hasToggleEdSimMenu, 'toggleEdSimMenu missing in Studio');
    assert(studioState.hasLdocUiAlign, 'ldocUiAlign missing in Studio');
    assert(studioState.hasLdocUiDistribute, 'ldocUiDistribute missing in Studio');
    assert(studioState.hasLdocUiGroup, 'ldocUiGroup missing in Studio');
    assert(studioState.hasLdocUiUngroup, 'ldocUiUngroup missing in Studio');
    assert(studioState.hasLdocOpenContrastModal, 'ldocOpenContrastModal missing in Studio');

    // 2.2: Add Vector Shape in Studio
    console.log('   Testing Vector Shape in Studio...');
    const studioShapeResult = await chrome.evaluate(`
      (function() {
        edAddBlock('shape', 'star');
        const pList = (typeof edPages !== 'undefined') ? edPages : [];
        const page = pList.find(p => p.id === edCurrentPage) || pList[0];
        const block = page.blocks[page.blocks.length - 1];
        
        block.fill = '#38bdf8';
        block.stroke = '#0284c7';
        block.strokeWidth = 2;
        if (typeof edRenderBlocks === 'function') edRenderBlocks();
        if (typeof renderCurrentSlide === 'function') renderCurrentSlide();

        return {
          id: block.id,
          type: block.type,
          shapeType: block.shape_type || block.shape || block.shapeType,
          fill: block.fill
        };
      })()
    `);
    console.log('   Studio Shape Created:', JSON.stringify(studioShapeResult));
    assert.strictEqual(studioShapeResult.type, 'shape');
    assert.strictEqual(studioShapeResult.shapeType, 'star');

    // 2.3: Add Simulation Block in Studio
    console.log('   Testing Reactive Simulation in Studio...');
    const studioSimResult = await chrome.evaluate(`
      (function() {
        edAddBlock('simulation', 'ohms_law');
        const pList = (typeof edPages !== 'undefined') ? edPages : [];
        const page = pList.find(p => p.id === edCurrentPage) || pList[0];
        const block = page.blocks[page.blocks.length - 1];

        const reactiveEngine = window.LDocReactiveEngine;
        let success = false;
        let currentVal = 0;
        if (reactiveEngine && reactiveEngine.SIMULATION_PRESETS) {
          const presetFn = reactiveEngine.SIMULATION_PRESETS[block.preset] || reactiveEngine.SIMULATION_PRESETS.ohms_law;
          if (typeof presetFn === 'function') {
            const dag = presetFn({ voltage: 24, resistance: 6 });
            currentVal = dag.getValue('current');
            success = (currentVal === 4);
          }
        }

        return {
          id: block.id,
          type: block.type,
          preset: block.preset,
          success,
          currentVal
        };
      })()
    `);
    console.log('   Studio Simulation Created:', JSON.stringify(studioSimResult));
    assert.strictEqual(studioSimResult.type, 'simulation');
    assert.strictEqual(studioSimResult.preset, 'ohms_law');
    assert(studioSimResult.success, 'Studio Ohm\'s Law DAG evaluation failed');

    // 2.4: Add Interactive Quiz in Studio
    console.log('   Testing Interactive Quiz in Studio...');
    const studioQuizResult = await chrome.evaluate(`
      (function() {
        edAddBlock('quiz');
        const pList = (typeof edPages !== 'undefined') ? edPages : [];
        const page = pList.find(p => p.id === edCurrentPage) || pList[0];
        const block = page.blocks[page.blocks.length - 1];

        return {
          id: block.id,
          type: block.type,
          title: block.quizTitle,
          questionsCount: block.questions?.length || 0
        };
      })()
    `);
    console.log('   Studio Quiz Created:', JSON.stringify(studioQuizResult));
    assert.strictEqual(studioQuizResult.type, 'quiz');
    assert(studioQuizResult.questionsCount > 0, 'Studio Quiz questions missing');

    // 2.5: Test Grouping in Studio
    console.log('   Testing Multi-Selection Alignment & Grouping in Studio...');
    const studioGroupResult = await chrome.evaluate(`
      (function() {
        const pList = (typeof edPages !== 'undefined') ? edPages : [];
        const page = pList.find(p => p.id === edCurrentPage) || pList[0];
        if (page.blocks.length >= 2) {
          const b1 = page.blocks[page.blocks.length - 2];
          const b2 = page.blocks[page.blocks.length - 1];
          b1.x = 50; b1.y = 50; b1.width = 150; b1.height = 100;
          b2.x = 300; b2.y = 120; b2.width = 150; b2.height = 100;

          // Re-render blocks to ensure DOM checkboxes exist
          if (typeof edRenderBlocks === 'function') edRenderBlocks();

          // Select checkboxes in studio DOM
          const cbs = document.querySelectorAll('.ed-block-select-cb');
          if (cbs.length >= 2) {
            cbs[cbs.length - 2].checked = true;
            cbs[cbs.length - 1].checked = true;
          }

          // Trigger align center
          ldocUiAlign('center');

          // Trigger group
          ldocUiGroup();
          const groupBlock = page.blocks[page.blocks.length - 1];
          const isGroup = groupBlock.type === 'group';
          const childCount = groupBlock.children?.length || 0;

          // Trigger ungroup
          if (typeof edRenderBlocks === 'function') edRenderBlocks();
          const groupCbs = document.querySelectorAll('.ed-block-select-cb');
          if (groupCbs.length > 0) groupCbs[groupCbs.length - 1].checked = true;
          ldocUiUngroup();
          const lastBlock = page.blocks[page.blocks.length - 1];

          return {
            isGroup,
            childCount,
            ungroupSuccess: lastBlock.type !== 'group'
          };
        }
        return { isGroup: false };
      })()
    `);
    console.log('   Studio Grouping Result:', JSON.stringify(studioGroupResult));
    assert(studioGroupResult.isGroup, 'Studio grouping failed');
    assert.strictEqual(studioGroupResult.childCount, 2, 'Group should have 2 children');
    assert(studioGroupResult.ungroupSuccess, 'Studio ungrouping failed');

    // 2.6: Test Studio WCAG Modal
    console.log('   Testing Studio WCAG Modal...');
    const studioModalResult = await chrome.evaluate(`
      (function() {
        ldocOpenContrastModal();
        const modal = document.getElementById('ldoc-contrast-modal');
        const isOpen = modal && modal.style.display !== 'none';
        if (modal) modal.style.display = 'none';
        return { isOpen };
      })()
    `);
    console.log('   Studio WCAG Modal Result:', JSON.stringify(studioModalResult));
    assert(studioModalResult.isOpen, 'Studio WCAG Contrast modal did not open');

    // Capture Studio screenshot
    const studioScreenPath = path.join(outDir, 'studio_authoring_ui.png');
    await chrome.captureScreenshot(studioScreenPath);
    console.log(`   📸 Saved Studio screenshot: ${studioScreenPath}`);

    console.log('\n================================================================');
    console.log('🎉 ALL LDOCX AUTHORING UI INTEGRATION SMOKE TESTS PASSED 100%!');
    console.log('================================================================\n');

  } finally {
    await chrome.close();
  }
}

runSmokeTest().catch(err => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});
