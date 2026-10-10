/**
 * LDOC Studio — Figma / Linear Grade Interactive Engine
 * Lucide Vector Icon Injection, Theme Swatches, Bottom Status Bar,
 * Device Frame Switcher & Template Onboarding.
 */

(function () {
  'use strict';

  // ── 1. LUCIDE SVG ICONS LIBRARY ──
  const ICONS = {
    eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    code: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
    refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>',
    folder: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>',
    archive: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"></rect><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path><path d="M10 12h4"></path></svg>',
    wand: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"></path><path d="m14 7 3 3"></path><path d="M5 6v4"></path><path d="M19 14v4"></path><path d="M10 2v2"></path><path d="M7 8H3"></path><path d="M21 16h-4"></path><path d="M11 3H9"></path></svg>',
    save: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    layers: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
    type: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>',
    image: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>',
    video: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="12" x="2" y="6" rx="2"></rect><path d="m22 7-6 5 6 5V7z"></path></svg>',
    music: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>',
    box: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    cpu: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"></rect><rect width="6" height="6" x="9" y="9"></rect><path d="M9 1v3"></path><path d="M15 1v3"></path><path d="M9 20v3"></path><path d="M15 20v3"></path><path d="M20 9h3"></path><path d="M20 14h3"></path><path d="M1 9h3"></path><path d="M1 14h3"></path></svg>',
    sparkles: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>',
    monitor: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>',
    tablet: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
    smartphone: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
    maximize: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>',
    sliders: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>'
  };

  // ── 2. REFINING CARTOON EMOJIS WITH CRISP VECTOR SVGS ──
  function upgradeStudioIcons() {
    // Tab buttons
    const tabMap = {
      'tab-viewer': { icon: ICONS.eye, label: 'Viewer' },
      'tab-editor': { icon: ICONS.code, label: 'AST Editor' },
      'tab-converter': { icon: ICONS.refresh, label: 'Convert' },
      'tab-templates': { icon: ICONS.archive, label: 'Vault' },
      'tab-docs': { icon: ICONS.folder, label: 'Documents' }
    };

    Object.keys(tabMap).forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.innerHTML = `${tabMap[id].icon}<span>${tabMap[id].label}</span>`;
      }
    });

    // Save & Open buttons
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
      saveBtn.innerHTML = `${ICONS.save}<span>Save .ldocx</span>`;
    }
    const openBtn = document.getElementById('open-btn');
    if (openBtn) {
      openBtn.innerHTML = `${ICONS.folder}<span>Open .ldocx</span>`;
    }
    const fxBtn = document.getElementById('fx-wizard-toggle-btn');
    if (fxBtn) {
      fxBtn.innerHTML = `${ICONS.wand}<span>FX Wizard</span>`;
    }
    const motionBtn = document.getElementById('motion-toggle-btn');
    if (motionBtn) {
      motionBtn.innerHTML = `${ICONS.sparkles}<span>Motion</span>`;
    }

    // Replace Visual Creator link in toolbar
    const creatorLink = document.querySelector('a[href="creator.html"]');
    if (creatorLink && creatorLink.closest('#toolbar')) {
      creatorLink.innerHTML = `${ICONS.wand}<span>Visual Creator</span>`;
    }
  }

  // ── 3. VISUAL THEME SWATCHES ──
  const THEME_PALETTES = {
    paper: { color: '#e8dcc4', name: 'Paper' },
    glass: { color: '#38bdf8', name: 'Glass' },
    deck: { color: '#6366f1', name: 'Deck' },
    gazette: { color: '#94a3b8', name: 'Gazette' },
    cyber: { color: '#10b981', name: 'Cyber' },
    velvet: { color: '#a855f7', name: 'Velvet' },
    nebula: { color: '#ec4899', name: 'Nebula' },
    zen: { color: '#14b8a6', name: 'Zen' },
    aquatic: { color: '#0284c7', name: 'Aquatic' },
    prism: { color: '#fbbf24', name: 'Prism' }
  };

  function upgradeThemeSwatches() {
    const selector = document.getElementById('pres-mode-selector');
    if (!selector) return;

    Object.keys(THEME_PALETTES).forEach(key => {
      const btn = document.getElementById(`mode-${key}`);
      if (btn) {
        const theme = THEME_PALETTES[key];
        btn.innerHTML = `<span class="swatch-dot" style="background:${theme.color};color:${theme.color}"></span><span>${theme.name}</span>`;
      }
    });
  }

  // ── 4. FIGMA-GRADE BOTTOM STATUS BAR & ZOOM CONTROLLER ──
  let currentZoom = 100;
  let currentDeviceFrame = 'desktop';

  function createBottomStatusBar() {
    if (document.getElementById('ldoc-bottom-statusbar')) return;

    const sb = document.createElement('footer');
    sb.id = 'ldoc-bottom-statusbar';
    sb.innerHTML = `
      <div class="sb-group">
        <button class="sb-btn" id="sb-prev-slide" title="Previous Slide (Left Arrow)">◀</button>
        <span id="sb-slide-counter" style="font-family:'JetBrains Mono',monospace;color:#cbd5e1">Slide 1</span>
        <button class="sb-btn" id="sb-next-slide" title="Next Slide (Right Arrow)">▶</button>
        <div class="sb-divider"></div>
        <span style="font-size:10.5px;color:#64748b;font-family:'JetBrains Mono',monospace" id="sb-dim-info">1920 &times; 1080</span>
      </div>

      <div class="sb-group">
        <button class="sb-btn active" id="sb-device-desktop" title="Desktop Presentation View">${ICONS.monitor}<span>Desktop</span></button>
        <button class="sb-btn" id="sb-device-tablet" title="Tablet View (820x1024)">${ICONS.tablet}<span>Tablet</span></button>
        <button class="sb-btn" id="sb-device-mobile" title="Mobile View (390x844)">${ICONS.smartphone}<span>Mobile</span></button>
      </div>

      <div class="sb-group">
        <button class="sb-btn" id="sb-zoom-out" title="Zoom Out (Ctrl -)">-</button>
        <span id="sb-zoom-label" style="font-family:'JetBrains Mono',monospace;color:#f1f5f9;min-width:38px;text-align:center">100%</span>
        <button class="sb-btn" id="sb-zoom-in" title="Zoom In (Ctrl +)">+</button>
        <button class="sb-btn" id="sb-zoom-fit" title="Fit to Viewport">Fit</button>
        <div class="sb-divider"></div>
        <div class="sb-btn" style="background:rgba(16,185,129,0.12);border-color:rgba(16,185,129,0.3);color:#34d399;font-size:10.5px;font-weight:700">
          <span>✓ Zero-Drift Pretext</span>
        </div>
        <button class="sb-btn" id="sb-fullscreen" title="Toggle Fullscreen (F11)">${ICONS.maximize}</button>
      </div>
    `;

    document.body.appendChild(sb);

    // Event Listeners
    document.getElementById('sb-prev-slide')?.addEventListener('click', () => {
      if (typeof window.prevSlide === 'function') window.prevSlide();
    });
    document.getElementById('sb-next-slide')?.addEventListener('click', () => {
      if (typeof window.nextSlide === 'function') window.nextSlide();
    });

    // Zoom Controls
    document.getElementById('sb-zoom-in')?.addEventListener('click', () => setZoom(currentZoom + 10));
    document.getElementById('sb-zoom-out')?.addEventListener('click', () => setZoom(currentZoom - 10));
    document.getElementById('sb-zoom-fit')?.addEventListener('click', () => setZoom(100));

    // Device Frame Switcher
    document.getElementById('sb-device-desktop')?.addEventListener('click', () => setDeviceFrame('desktop'));
    document.getElementById('sb-device-tablet')?.addEventListener('click', () => setDeviceFrame('tablet'));
    document.getElementById('sb-device-mobile')?.addEventListener('click', () => setDeviceFrame('mobile'));

    // Fullscreen
    document.getElementById('sb-fullscreen')?.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    });
  }

  function setZoom(val) {
    currentZoom = Math.max(50, Math.min(200, val));
    const label = document.getElementById('sb-zoom-label');
    if (label) label.textContent = `${currentZoom}%`;

    const canvas = document.getElementById('page-canvas') || document.getElementById('content-area') || document.getElementById('creator-preview-pane');
    if (canvas) {
      canvas.style.transform = `scale(${currentZoom / 100})`;
      canvas.style.transformOrigin = 'center top';
      canvas.style.transition = 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)';
    }
  }

  function setDeviceFrame(frame) {
    currentDeviceFrame = frame;
    ['desktop', 'tablet', 'mobile'].forEach(f => {
      const btn = document.getElementById(`sb-device-${f}`);
      if (btn) btn.classList.toggle('active', f === frame);
    });

    const target = document.getElementById('content-area') || document.getElementById('creator-preview-pane');
    if (!target) return;

    target.classList.remove('frame-desktop', 'frame-tablet', 'frame-mobile');
    if (frame === 'tablet') {
      target.classList.add('frame-tablet');
    } else if (frame === 'mobile') {
      target.classList.add('frame-mobile');
    } else {
      target.classList.add('frame-desktop');
    }
  }

  // ── 5. TEMPLATE ONBOARDING PICKER (FOR CREATOR) ──
  function initCreatorTemplatePicker() {
    if (!window.location.pathname.includes('creator') && !window.location.href.includes('creator.html')) return;
    if (document.getElementById('creator-template-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'creator-template-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(8, 9, 13, 0.85); backdrop-filter: blur(16px);
      z-index: 99999; display: none; align-items: center; justify-content: center; padding: 20px;
    `;
    modal.innerHTML = `
      <div style="background:#0e111a;border:1px solid rgba(255,255,255,0.1);border-radius:16px;max-width:760px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,0.8);padding:28px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
          <div>
            <span style="font-size:11px;font-weight:700;letter-spacing:1px;color:#f59e0b;text-transform:uppercase">NEW LIVING DOCUMENT</span>
            <h2 style="font-family:'Space Grotesk',sans-serif;font-size:22px;color:#ffffff;margin:4px 0 0">Choose a Starting Blueprint</h2>
          </div>
          <button onclick="document.getElementById('creator-template-modal').style.display='none'" style="background:none;border:none;color:#94a3b8;font-size:18px;cursor:pointer">✕</button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;margin-bottom:24px">
          <div class="template-card" onclick="selectCreatorTemplate('deck')" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;cursor:pointer;transition:all .15s">
            <div style="font-size:20px;margin-bottom:8px">📊</div>
            <div style="font-weight:700;color:#f8fafc;font-size:14px">Keynote Executive Deck</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px">Dark luxury presentation with KPI telemetry and interactive charts.</div>
          </div>

          <div class="template-card" onclick="selectCreatorTemplate('glass')" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;cursor:pointer;transition:all .15s">
            <div style="font-size:20px;margin-bottom:8px">🪟</div>
            <div style="font-weight:700;color:#f8fafc;font-size:14px">3D Spatial Hardware Spec</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px">Frosted glass cards with live WebGL 3D model viewport.</div>
          </div>

          <div class="template-card" onclick="selectCreatorTemplate('paper')" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;cursor:pointer;transition:all .15s">
            <div style="font-size:20px;margin-bottom:8px">📄</div>
            <div style="font-weight:700;color:#f8fafc;font-size:14px">Research Technical Paper</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px">Dual-column balanced typography with Pretext arithmetic layout.</div>
          </div>

          <div class="template-card" onclick="selectCreatorTemplate('cyber')" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;cursor:pointer;transition:all .15s">
            <div style="font-size:20px;margin-bottom:8px">⚡</div>
            <div style="font-weight:700;color:#f8fafc;font-size:14px">Cyber Cryptographic Report</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px">Monospace terminal layout with live SHA-256 Merkle proofs.</div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px">
          <button onclick="document.getElementById('creator-template-modal').style.display='none'" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);color:#ffffff;padding:8px 16px;border-radius:8px;font-size:12px;cursor:pointer">Start Blank</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    window.openCreatorTemplatePicker = function () {
      modal.style.display = 'flex';
    };

    window.selectCreatorTemplate = function (theme) {
      modal.style.display = 'none';
      if (typeof window.setCreatorPresentationMode === 'function') {
        window.setCreatorPresentationMode(theme);
      }
    };
  }

  // ── 6. INITIALIZATION ──
  document.addEventListener('DOMContentLoaded', () => {
    upgradeStudioIcons();
    upgradeThemeSwatches();
    createBottomStatusBar();
    initCreatorTemplatePicker();
  });
})();
