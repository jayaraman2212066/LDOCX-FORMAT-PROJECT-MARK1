const { ChromeController } = require('./cdp_helper');

async function auditControls() {
  const chrome = new ChromeController({ port: 9558 });
  await chrome.start();
  try {
    console.log('Auditing Studio...');
    await chrome.navigate('http://127.0.0.1:3000/studio.html');
    await new Promise(r => setTimeout(r, 1500));

    const studioAudit = await chrome.evaluate(`
      (function() {
        // Toolbar items
        const shapeDropdownItems = document.querySelectorAll('#ed-shapes-menu > div').length;
        const simDropdownItems = document.querySelectorAll('#ed-sims-menu > div').length;
        const chartDropdownItems = document.querySelectorAll('#ed-charts-menu > div').length;
        const alignDropdownItems = document.querySelectorAll('#ed-align-menu > div').length;
        const distributeDropdownItems = document.querySelectorAll('#ed-distribute-menu > div').length;
        const zOrderDropdownItems = document.querySelectorAll('#ed-zorder-menu > div').length;
        const groupBtns = document.querySelectorAll('button[onclick*="ldocUiGroup"], button[onclick*="ldocUiUngroup"]').length;
        const brandBtn = document.querySelectorAll('button[onclick*="ldocOpenBrandModal"]').length;
        const reactiveBtn = document.querySelectorAll('button[onclick*="ldocOpenReactivePanel"]').length;
        const quizBtn = document.querySelectorAll('button[onclick*="edAddBlock(\\'quiz\\')"]').length;

        // Modal Controls
        ldocOpenBrandModal();
        const brandModalInputs = document.querySelectorAll('#ldoc-contrast-modal input, #ldoc-contrast-modal button').length;
        document.getElementById('ldoc-contrast-modal')?.remove();

        ldocOpenReactivePanel();
        const reactivePanelInputs = document.querySelectorAll('#ldoc-reactive-panel input, #ldoc-reactive-panel button, #ldoc-reactive-panel textarea').length;
        document.getElementById('ldoc-reactive-panel')?.remove();

        // Add blocks to count inspector controls
        edAddBlock('shape', 'rounded_rect');
        edAddBlock('simulation', 'projectile_motion');
        edAddBlock('quiz');
        edAddBlock('chart');
        edAddBlock('3d_model');

        edRenderBlocks();

        const pList = edPages || [];
        const p = pList[0];

        const inspectorCounts = {};
        p.blocks.forEach(b => {
          const el = document.getElementById('blk_' + b.id);
          if (el) {
            const inputs = el.querySelectorAll('input, select, textarea, button').length;
            inspectorCounts[b.type] = inputs;
          }
        });

        return {
          shapeDropdownItems,
          simDropdownItems,
          chartDropdownItems,
          alignDropdownItems,
          distributeDropdownItems,
          zOrderDropdownItems,
          groupBtns,
          brandBtn,
          reactiveBtn,
          quizBtn,
          brandModalInputs,
          reactivePanelInputs,
          inspectorCounts
        };
      })()
    `);
    console.log('Studio Audit Results:', JSON.stringify(studioAudit, null, 2));

    console.log('\nAuditing Creator...');
    await chrome.navigate('http://127.0.0.1:3000/creator.html');
    await new Promise(r => setTimeout(r, 1500));

    const creatorAudit = await chrome.evaluate(`
      (function() {
        // Toolbar buttons
        const shapeDropdownItems = document.querySelectorAll('#cr-shape-dropdown-menu button').length;
        const simDropdownItems = document.querySelectorAll('#cr-sim-dropdown-menu button').length;
        const alignBtns = document.querySelectorAll('button[onclick*="creatorAlign"]').length;
        const distributeBtns = document.querySelectorAll('button[onclick*="creatorDistribute"]').length;
        const zOrderBtns = document.querySelectorAll('button[onclick*="creatorZOrder"]').length;
        const groupBtns = document.querySelectorAll('button[onclick*="creatorGroup"], button[onclick*="creatorUngroup"]').length;
        const brandBtn = document.querySelectorAll('button[onclick*="creatorOpenBrandModal"]').length;
        const reactiveBtn = document.querySelectorAll('button[onclick*="creatorOpenReactivePanel"]').length;
        const quizBtn = document.querySelectorAll('button[onclick*="addBlock(\\'quiz\\')"]').length;
        const chartBtn = document.querySelectorAll('button[onclick*="addBlock(\\'chart\\')"]').length;

        // Modal Controls
        creatorOpenBrandModal();
        const brandModalInputs = document.querySelectorAll('#cr-contrast-modal input, #cr-contrast-modal button').length;
        document.getElementById('cr-contrast-modal')?.remove();

        creatorOpenReactivePanel();
        const reactivePanelInputs = document.querySelectorAll('#cr-reactive-panel input, #cr-reactive-panel button, #cr-reactive-panel textarea').length;
        document.getElementById('cr-reactive-panel')?.remove();

        // Add blocks
        addBlock('shape', 'rounded_rect');
        addBlock('simulation', 'projectile_motion');
        addBlock('quiz');
        addBlock('chart');
        addBlock('3d_model');

        renderBlocks();
        const pList = pages || [];
        const p = pList[0];

        const inspectorCounts = {};
        p.blocks.forEach(b => {
          const card = document.getElementById('cr_blk_' + b.id);
          if (card) {
            const inputs = card.querySelectorAll('input, select, textarea, button').length;
            inspectorCounts[b.type] = inputs;
          }
        });

        return {
          shapeDropdownItems,
          simDropdownItems,
          alignBtns,
          distributeBtns,
          zOrderBtns,
          groupBtns,
          brandBtn,
          reactiveBtn,
          quizBtn,
          chartBtn,
          brandModalInputs,
          reactivePanelInputs,
          inspectorCounts
        };
      })()
    `);
    console.log('Creator Audit Results:', JSON.stringify(creatorAudit, null, 2));

  } finally {
    await chrome.close();
  }
}

auditControls().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
