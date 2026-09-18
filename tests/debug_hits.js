const { ChromeController } = require('./cdp_helper');
const path = require('path');
const { pathToFileURL } = require('url');

async function debugHits() {
  const cdp = new ChromeController({ port: 9455 });
  await cdp.start();

  try {
    // 1. Diagnose Live Studio
    console.log('=== DIAGNOSING LIVE STUDIO PAGES PANEL ===');
    const lsPath = path.resolve(__dirname, '..', '..', 'local_ldoc studio pro', 'clone_ldoc', 'live-studio.html');
    await cdp.send('Page.navigate', { url: pathToFileURL(lsPath).href });
    await new Promise(r => setTimeout(r, 2200));

    const pageState = await cdp.send('Runtime.evaluate', {
      expression: `({
        hasAuthModal: !!document.getElementById('auth-modal'),
        authParent: document.getElementById('auth-modal') ? document.getElementById('auth-modal').parentElement.tagName : null,
        hasPagesOverlay: !!document.getElementById('pages-overlay'),
        allDivIdsEnding: Array.from(document.querySelectorAll('div[id]')).map(d => d.id).slice(-15)
      })`,
      returnByValue: true
    });
    console.log('Live Studio Divs Info:', pageState.result.value);

    const lsHitRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const panel = document.getElementById('pages-panel');
        const overlay = document.getElementById('pages-overlay');
        const rect = panel.getBoundingClientRect();
        const ptX = rect.left + 50;
        const ptY = rect.top + 70;
        const topEl = document.elementFromPoint(ptX, ptY);
        return {
          rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          topElTag: topEl ? topEl.tagName : null,
          topElId: topEl ? topEl.id : null,
          topElClass: topEl ? topEl.className : null,
          topElSnippet: topEl ? topEl.outerHTML.slice(0, 150) : null,
          isInside: panel.contains(topEl),
          overlayOpen: overlay.classList.contains('open'),
          overlayParent: overlay.parentElement.tagName
        };
      })()`,
      returnByValue: true
    });
    // 2. Diagnose Viewer Presentation
    console.log('\n=== DIAGNOSING VIEWER PRESENTATION ===');
    const vPath = path.resolve(__dirname, '..', '..', 'local_ldoc studio pro', 'clone_ldoc', 'viewer.html');
    await cdp.send('Page.navigate', { url: pathToFileURL(vPath).href });
    await new Promise(r => setTimeout(r, 2200));

    const vCheckBefore = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const root = document.getElementById('ldoc-overlay-root');
        return {
          hasRoot: !!root,
          parentTag: root && root.parentElement ? root.parentElement.tagName : null,
          parentId: root && root.parentElement ? root.parentElement.id : null,
          parentClass: root && root.parentElement ? root.parentElement.className : null,
          parentOuterSnippet: root && root.parentElement ? root.parentElement.outerHTML.slice(0, 200) : null
        };
      })()`,
      returnByValue: true
    });
    console.log('Viewer Overlay Root Parent:', vCheckBefore.result.value);

    const enterRes = await cdp.send('Runtime.evaluate', {
      expression: 'window.ldocPresentation ? window.ldocPresentation.enter() : "no-pres";',
      returnByValue: true
    });
    console.log('Enter result:', enterRes.result.value);
    await new Promise(r => setTimeout(r, 600));

    const vCheckAfter = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const controls = document.getElementById('ldoc-pres-controls');
        const exitBtn = document.getElementById('ldoc-btn-exit');
        return {
          hasControls: !!controls,
          hasExit: !!exitBtn,
          bodyHasPresClass: document.body.classList.contains('ldoc-presenting'),
          controlsParent: controls ? controls.parentElement.tagName + '#' + controls.parentElement.id : null,
          controlsStyleDisplay: controls ? window.getComputedStyle(controls).display : null,
          exitBtnRect: exitBtn ? exitBtn.getBoundingClientRect() : null
        };
      })()`,
      returnByValue: true
    });
    console.log('Viewer After Enter:', vCheckAfter.result.value);

    const vRes = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const controls = document.getElementById('ldoc-pres-controls');
        const exitBtn = document.getElementById('ldoc-btn-exit');
        if (!controls || !exitBtn) return { hasControls: !!controls, hasExit: !!exitBtn };
        const cCs = window.getComputedStyle(controls);
        const eCs = window.getComputedStyle(exitBtn);
        const cRect = controls.getBoundingClientRect();
        const eRect = exitBtn.getBoundingClientRect();
        return {
          controls: {
            display: cCs.display,
            visibility: cCs.visibility,
            opacity: cCs.opacity,
            zIndex: cCs.zIndex,
            parent: controls.parentElement.tagName + '#' + controls.parentElement.id,
            rect: { left: cRect.left, top: cRect.top, width: cRect.width, height: cRect.height }
          },
          exitBtn: {
            display: eCs.display,
            visibility: eCs.visibility,
            opacity: eCs.opacity,
            rect: { left: eRect.left, top: eRect.top, width: eRect.width, height: eRect.height },
            innerText: exitBtn.innerText
          }
        };
      })()`,
      returnByValue: true
    });
    console.log('Viewer Detailed Result:', vRes.result.value);

  } finally {
    await cdp.stop();
  }
}

debugHits();
