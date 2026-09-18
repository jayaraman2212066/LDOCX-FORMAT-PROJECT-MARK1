/**
 * LDOCX Universal Presentation Runtime — v3.0.0
 * The Living Document Presentation Engine
 * 
 * CRITICAL ARCHITECTURAL PRINCIPLE:
 * Presentation Mode must NEVER flatten LDOCX into a static image or screenshot.
 * All dynamic capabilities — 3D WebGL scenes, OrbitControls, reactive computational DAGs,
 * physics simulations, interactive charts, quizzes, and audio/video — remain 100% alive.
 * 
 * Supports:
 * - Studio, Live Studio, Creator, and Viewer surfaces
 * - PowerPoint-style presentation mode with Ctrl+F5 entry & Esc exit
 * - Figma/Canva-style viewport transforms (contain, cover, 100%, custom zoom 25%-500%)
 * - Pan & Zoom gestures (middle drag, space drag, mouse wheel)
 * - Auto-fading glassmorphic presenter controls
 * - Multi-page slide navigation & continuous living canvas presentation
 * - Contextual 3D presentation tools (Reset Camera, Exploded View, Zoom)
 * - Browser Fullscreen API integration with fallback
 * - Deep linking (?presentation=true & ?fullscreen=true)
 * 
 * (C) 2026 J AI ENTERPRISES — Apache-2.0 License
 */

(function(global) {
  'use strict';

  // ── CSS STYLES FOR UNIVERSAL PRESENTATION RUNTIME ──
  const PRESENTATION_CSS = `
    /* Presentation Root State */
    body.ldoc-presenting {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      background: #090d16 !important;
      user-select: none;
    }

    /* Hide Authoring Chrome across Studio, Live Studio, Creator, and Viewer */
    body.ldoc-presenting #top-bar,
    body.ldoc-presenting #desktop-menubar,
    body.ldoc-presenting #menubar,
    body.ldoc-presenting #sidebar-left,
    body.ldoc-presenting #sidebar-right,
    body.ldoc-presenting #statusbar,
    body.ldoc-presenting #drawer-backdrop,
    body.ldoc-presenting #left.open,
    body.ldoc-presenting #right.open,
    body.ldoc-presenting #creator-header,
    body.ldoc-presenting #elements-popup,
    body.ldoc-presenting #pages-drawer,
    body.ldoc-presenting #blocks-drawer,
    body.ldoc-presenting .studio-toolbar,
    body.ldoc-presenting .editor-toolbar,
    body.ldoc-presenting .inspector-panel,
    body.ldoc-presenting .layer-panel,
    body.ldoc-presenting .template-controls,
    body.ldoc-presenting .authoring-overlay,
    body.ldoc-presenting .debug-ui,
    body.ldoc-presenting .selection-box,
    body.ldoc-presenting .block-selected,
    body.ldoc-presenting .handle,
    body.ldoc-presenting .resize-handle,
    body.ldoc-presenting .rotate-handle,
    body.ldoc-presenting .pen-tool-guide,
    body.ldoc-presenting .magnetic-guide,
    body.ldoc-presenting .ruler,
    body.ldoc-presenting .smart-guide,
    body.ldoc-presenting .node-control,
    body.ldoc-presenting .mode-pill-container,
    body.ldoc-presenting .fx-menu-dropdown {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }

    /* Presentation Viewport Stage */
    body.ldoc-presenting #viewport-container,
    body.ldoc-presenting #viewer-panel,
    body.ldoc-presenting #center,
    body.ldoc-presenting #creator-preview-pane,
    body.ldoc-presenting #content-area {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: 100vw !important;
      max-height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      z-index: 99990 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      overflow: hidden !important;
    }

    /* Transform Stage for Active Document Canvas */
    .ldoc-presentation-stage {
      position: relative;
      transform-origin: center center;
      transition: transform 0.12s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.7);
      pointer-events: auto !important;
      user-select: auto;
    }

    /* Ensure interactive capabilities remain 100% alive */
    .ldoc-presentation-stage canvas,
    .ldoc-presentation-stage input,
    .ldoc-presentation-stage button,
    .ldoc-presentation-stage select,
    .ldoc-presentation-stage video,
    .ldoc-presentation-stage audio,
    .ldoc-presentation-stage .block,
    .ldoc-presentation-stage .quiz-option,
    .ldoc-presentation-stage .reactive-slider,
    .ldoc-presentation-stage .three-canvas,
    .ldoc-presentation-stage .interactive-node {
      pointer-events: auto !important;
    }

    /* Auto-Fading Glassmorphic Presenter Controls Bar */
    #ldoc-pres-controls {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(0);
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 9999px;
      box-shadow: 0 16px 36px -8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.06);
      color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      font-size: 12px;
      transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      opacity: 1;
      pointer-events: auto;
    }

    #ldoc-pres-controls.faded {
      opacity: 0;
      transform: translateX(-50%) translateY(12px);
      pointer-events: none;
    }

    #ldoc-pres-controls:hover,
    #ldoc-pres-controls:focus-within {
      opacity: 1 !important;
      transform: translateX(-50%) translateY(0) !important;
      pointer-events: auto !important;
    }

    .pres-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 500;
      padding: 5px 9px;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
      white-space: nowrap;
      height: 28px;
    }

    .pres-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.18);
    }

    .pres-btn:active {
      transform: scale(0.96);
      background: rgba(255, 255, 255, 0.18);
    }

    .pres-btn.primary {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #ffffff;
      font-weight: 600;
      border-color: rgba(255, 255, 255, 0.2);
    }

    .pres-btn.primary:hover {
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
      box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
    }

    .pres-btn.danger:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.4);
    }

    .pres-divider {
      width: 1px;
      height: 18px;
      background: rgba(255, 255, 255, 0.16);
      margin: 0 3px;
    }

    .pres-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      font-size: 11.5px;
      font-weight: 600;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.07);
      border-radius: 4px;
      letter-spacing: 0.02em;
    }

    /* Contextual 3D Presentation Toolbar */
    #ldoc-pres-3d-tools {
      position: absolute;
      top: 14px;
      right: 14px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 8px;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }

    #ldoc-pres-3d-tools.visible {
      opacity: 1;
      pointer-events: auto;
    }
  `;

  class LDocPresentationRuntime {
    constructor() {
      this.state = {
        active: false,
        page: 1,
        totalPages: 1,
        zoom: 1.0,
        fitZoom: 1.0,
        panX: 0,
        panY: 0,
        isFullscreen: false,
        controlsVisible: true,
        surface: 'unknown',
        targetContainer: null,
        previousEditorState: null
      };

      this._inactivityTimer = null;
      this._isPanning = false;
      this._panStartX = 0;
      this._panStartY = 0;
      this._initialPanX = 0;
      this._initialPanY = 0;
      this._isSpacePressed = false;
      this._boundKeyDown = this._handleKeyDown.bind(this);
      this._boundKeyUp = this._handleKeyUp.bind(this);
      this._boundMouseMove = this._handleMouseMove.bind(this);
      this._boundMouseDown = this._handleMouseDown.bind(this);
      this._boundMouseUp = this._handleMouseUp.bind(this);
      this._boundWheel = this._handleWheel.bind(this);
      this._boundResize = this._handleWindowResize.bind(this);
      this._boundFullscreenChange = this._handleFullscreenChange.bind(this);

      this._initStyles();
      this._autoLaunchIfRequested();
    }

    // ── STYLES INITIALIZATION ──
    _initStyles() {
      if (typeof document === 'undefined') return;
      if (document.getElementById('ldoc-presentation-styles')) return;
      const style = document.createElement('style');
      style.id = 'ldoc-presentation-styles';
      style.textContent = PRESENTATION_CSS;
      (document.head || document.documentElement).appendChild(style);
    }

    // ── SURFACE DETECTION ──
    detectSurface() {
      if (typeof document === 'undefined') return 'headless';
      if (document.getElementById('creator-preview-pane') || document.getElementById('creator-preview-body')) {
        return 'creator';
      }
      if (document.getElementById('live-studio-layout') || (typeof window !== 'undefined' && window.__isLiveStudio)) {
        return 'live-studio';
      }
      if (document.getElementById('canvas-container') || document.getElementById('top-bar')) {
        return 'studio';
      }
      if (document.getElementById('content-area') || (typeof window !== 'undefined' && window.__isViewer)) {
        return 'viewer';
      }
      return 'generic';
    }

    // ── TARGET ELEMENT RESOLUTION ──
    resolveTargetElement() {
      if (typeof document === 'undefined') return null;

      // 1. Creator preview pane
      const creatorBody = document.getElementById('creator-preview-body') || 
                          document.querySelector('#creator-preview-pane .pres-slide') ||
                          document.getElementById('creator-preview-pane');
      if (creatorBody && (this.state.surface === 'creator' || document.getElementById('creator-preview-pane'))) {
        return creatorBody;
      }

      // 2. Studio / Live Studio page canvas
      const pageCanvas = document.getElementById('page-canvas');
      if (pageCanvas) return pageCanvas;

      // 3. Document page class
      const ldocPage = document.querySelector('.ldoc-page') || document.querySelector('.pres-slide');
      if (ldocPage) return ldocPage;

      // 4. Viewer content area
      const contentArea = document.getElementById('content-area') || document.getElementById('viewer-panel');
      if (contentArea) return contentArea;

      return document.body;
    }

    // ── ENTER PRESENTATION RUNTIME ──
    enter(options = {}) {
      if (this.state.active) {
        console.warn('[LDocPresentationRuntime] Already in presentation mode.');
        return false;
      }

      // 1. Flush pending editor state
      if (typeof window !== 'undefined') {
        if (typeof window.flushEditorState === 'function') {
          try { window.flushEditorState(); } catch (e) {}
        } else if (typeof window.saveCurrentDocumentState === 'function') {
          try { window.saveCurrentDocumentState(); } catch (e) {}
        }
      }

      // 2. Snapshot previous editor state for exact restoration upon Esc
      this.state.previousEditorState = {
        scrollX: typeof window !== 'undefined' ? (window.scrollX || (document.documentElement ? document.documentElement.scrollLeft : 0)) : 0,
        scrollY: typeof window !== 'undefined' ? (window.scrollY || (document.documentElement ? document.documentElement.scrollTop : 0)) : 0,
        selectedBlockId: typeof window !== 'undefined' ? (window.selectedBlockId || null) : null,
        zoom: typeof window !== 'undefined' ? (window.currentZoom || 1.0) : 1.0,
        surface: this.detectSurface()
      };

      this.state.surface = this.state.previousEditorState.surface;
      this.state.active = true;
      this.state.panX = 0;
      this.state.panY = 0;

      // 3. Resolve target element
      const target = options.targetElement 
        ? (typeof options.targetElement === 'string' ? document.querySelector(options.targetElement) : options.targetElement)
        : this.resolveTargetElement();
      this.state.targetContainer = target;

      // 4. Deselect any active editor selection
      if (typeof window !== 'undefined' && typeof window.deselectAllBlocks === 'function') {
        try { window.deselectAllBlocks(); } catch (e) {}
      }

      // 5. Apply presentation classes
      if (typeof document !== 'undefined') {
        document.body.classList.add('ldoc-presenting');
        if (target) {
          target.classList.add('ldoc-presentation-stage');
        }
      }

      // 6. Multi-page slide count discovery
      this._updatePageCounts(options.page);

      // 7. Calculate fit-to-screen matrix
      this.fitToScreen();

      // 8. Render floating presenter controls
      this._renderControls();
      this._resetInactivityTimer();

      // 9. Attach global presentation event listeners
      if (typeof window !== 'undefined') {
        window.addEventListener('keydown', this._boundKeyDown, true);
        window.addEventListener('keyup', this._boundKeyUp, true);
        window.addEventListener('mousemove', this._boundMouseMove, { passive: true });
        window.addEventListener('mousedown', this._boundMouseDown, true);
        window.addEventListener('mouseup', this._boundMouseUp, true);
        window.addEventListener('wheel', this._boundWheel, { passive: false });
        window.addEventListener('resize', this._boundResize, { passive: true });
        document.addEventListener('fullscreenchange', this._boundFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this._boundFullscreenChange);
      }

      // 10. Request Fullscreen if explicitly specified in options or deep-link
      if (options.fullscreen) {
        this.requestFullscreen();
      }

      // 11. Dispatch presentation start event
      if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        const event = new CustomEvent('ldoc:presentation-start', { detail: { ...this.state } });
        window.dispatchEvent(event);
      }

      console.log(`[LDocPresentationRuntime] Entered presentation mode on [${this.state.surface}]. Fit: ${(this.state.zoom * 100).toFixed(0)}%`);
      return true;
    }

    // ── EXIT PRESENTATION RUNTIME ──
    exit() {
      if (!this.state.active) return false;

      // 1. Exit browser fullscreen if active
      if (typeof document !== 'undefined') {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          try {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          } catch (e) {}
        }
      }

      // 2. Remove presentation classes
      if (typeof document !== 'undefined') {
        document.body.classList.remove('ldoc-presenting');
        if (this.state.targetContainer) {
          this.state.targetContainer.classList.remove('ldoc-presentation-stage');
          this.state.targetContainer.style.transform = '';
        }
      }

      // 3. Destroy overlay controls
      if (typeof document !== 'undefined') {
        const controls = document.getElementById('ldoc-pres-controls');
        if (controls) controls.remove();
        const tools3D = document.getElementById('ldoc-pres-3d-tools');
        if (tools3D) tools3D.remove();
      }

      // 4. Detach event listeners
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', this._boundKeyDown, true);
        window.removeEventListener('keyup', this._boundKeyUp, true);
        window.removeEventListener('mousemove', this._boundMouseMove);
        window.removeEventListener('mousedown', this._boundMouseDown, true);
        window.removeEventListener('mouseup', this._boundMouseUp, true);
        window.removeEventListener('wheel', this._boundWheel);
        window.removeEventListener('resize', this._boundResize);
        document.removeEventListener('fullscreenchange', this._boundFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', this._boundFullscreenChange);
      }

      if (this._inactivityTimer) clearTimeout(this._inactivityTimer);

      // 5. Restore previous editor state
      const prev = this.state.previousEditorState;
      if (prev && typeof window !== 'undefined') {
        if (typeof window.scrollTo === 'function') {
          window.scrollTo(prev.scrollX || 0, prev.scrollY || 0);
        }
        if (prev.selectedBlockId && typeof window.selectBlock === 'function') {
          try { window.selectBlock(prev.selectedBlockId); } catch (e) {}
        }
      }

      this.state.active = false;
      this.state.isFullscreen = false;

      // 6. Dispatch exit event
      if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        const event = new CustomEvent('ldoc:presentation-exit', { detail: { restored: true } });
        window.dispatchEvent(event);
      }

      console.log('[LDocPresentationRuntime] Exited presentation mode. Editor state restored.');
      return true;
    }

    toggle(options = {}) {
      if (this.state.active) {
        return this.exit();
      } else {
        return this.enter(options);
      }
    }

    // ── VIEWPORT FIT & MATRIX TRANSFORM ──
    fitToScreen() {
      const target = this.state.targetContainer || this.resolveTargetElement();
      if (!target) return;

      const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

      // Target natural dimensions (standard 16:9 1920x1080 or measured DOM bounds)
      let docWidth = target.offsetWidth || 1920;
      let docHeight = target.offsetHeight || 1080;

      // Fallback to standard HD presentation dimensions if 0 or viewport-sized
      if (docWidth <= 0 || docWidth === viewportWidth) docWidth = 1920;
      if (docHeight <= 0 || docHeight === viewportHeight) docHeight = 1080;

      const scaleX = (viewportWidth * 0.94) / docWidth;
      const scaleY = (viewportHeight * 0.92) / docHeight;
      const fitScale = Math.min(scaleX, scaleY, 1.25);

      this.state.zoom = fitScale;
      this.state.fitZoom = fitScale;
      this.state.panX = 0;
      this.state.panY = 0;

      this._applyTransform();
      this._updateControls();
    }

    setZoom(level) {
      this.state.zoom = Math.max(0.25, Math.min(5.0, level));
      this._applyTransform();
      this._updateControls();
    }

    zoomIn(step = 0.15) {
      this.setZoom(this.state.zoom * (1 + step));
    }

    zoomOut(step = 0.15) {
      this.setZoom(this.state.zoom * (1 - step));
    }

    zoom100() {
      this.setZoom(1.0);
    }

    resetPan() {
      this.state.panX = 0;
      this.state.panY = 0;
      this._applyTransform();
    }

    panBy(dx, dy) {
      this.state.panX += dx;
      this.state.panY += dy;
      this._applyTransform();
    }

    _applyTransform() {
      const target = this.state.targetContainer;
      if (!target) return;
      target.style.transform = `translate3d(${this.state.panX}px, ${this.state.panY}px, 0) scale(${this.state.zoom})`;
    }

    // ── NAVIGATION CONTROLLER ──
    _updatePageCounts(requestedPage) {
      let pagesCount = 1;
      let curPage = requestedPage || 1;

      if (typeof window !== 'undefined') {
        if (Array.isArray(window.pages) && window.pages.length > 0) {
          pagesCount = window.pages.length;
          if (!requestedPage && window.currentPage) {
            const idx = window.pages.findIndex(p => p.id === window.currentPage || p.number === window.currentPage);
            curPage = idx >= 0 ? idx + 1 : 1;
          }
        } else if (typeof document !== 'undefined') {
          const slides = document.querySelectorAll('.pres-slide, .ldoc-page');
          if (slides && slides.length > 1) {
            pagesCount = slides.length;
          }
        }
      }

      this.state.page = curPage;
      this.state.totalPages = pagesCount;
    }

    nextPage() {
      if (this.state.page < this.state.totalPages) {
        this.goToPage(this.state.page + 1);
      } else if (typeof window !== 'undefined' && typeof window.nextSlide === 'function') {
        window.nextSlide();
        this.state.page = Math.min(this.state.totalPages, this.state.page + 1);
        this._updateControls();
      }
    }

    prevPage() {
      if (this.state.page > 1) {
        this.goToPage(this.state.page - 1);
      } else if (typeof window !== 'undefined' && typeof window.prevSlide === 'function') {
        window.prevSlide();
        this.state.page = Math.max(1, this.state.page - 1);
        this._updateControls();
      }
    }

    goToPage(pageNum) {
      const targetPage = Math.max(1, Math.min(this.state.totalPages, pageNum));
      this.state.page = targetPage;

      if (typeof window !== 'undefined') {
        if (typeof window.scrollToPage === 'function') {
          try { window.scrollToPage(targetPage); } catch (e) {}
        } else if (typeof window.goToPage === 'function') {
          try { window.goToPage(targetPage); } catch (e) {}
        } else if (typeof window.loadPage === 'function') {
          try { window.loadPage(targetPage); } catch (e) {}
        } else if (typeof window.selectPage === 'function' && Array.isArray(window.pages) && window.pages[targetPage - 1]) {
          try { window.selectPage(window.pages[targetPage - 1].id || targetPage); } catch (e) {}
        }
      }

      this._updateControls();
    }

    // ── FULLSCREEN API ──
    requestFullscreen() {
      if (typeof document === 'undefined') return;
      const el = document.documentElement;
      try {
        if (el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      } catch (err) {
        console.warn('[LDocPresentationRuntime] Fullscreen request prevented by browser policy.');
      }
    }

    exitFullscreen() {
      if (typeof document === 'undefined') return;
      try {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } catch (err) {}
    }

    toggleFullscreen() {
      if (typeof document === 'undefined') return;
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        this.exitFullscreen();
      } else {
        this.requestFullscreen();
      }
    }

    _handleFullscreenChange() {
      if (typeof document === 'undefined') return;
      this.state.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      this._updateControls();
    }

    // ── PRESENTER CONTROLS OVERLAY ──
    _renderControls() {
      if (typeof document === 'undefined') return;
      let controls = document.getElementById('ldoc-pres-controls');
      if (!controls) {
        controls = document.createElement('div');
        controls.id = 'ldoc-pres-controls';
        document.body.appendChild(controls);
      }

      const showNav = this.state.totalPages > 1;
      const zoomPct = Math.round(this.state.zoom * 100);

      controls.innerHTML = `
        ${showNav ? `
          <button class="pres-btn" id="ldoc-btn-prev" title="Previous Slide (← / ↑ / PgUp)">◀</button>
          <span class="pres-pill" id="ldoc-pres-counter">${this.state.page} / ${this.state.totalPages}</span>
          <button class="pres-btn" id="ldoc-btn-next" title="Next Slide (→ / ↓ / PgDn / Space)">▶</button>
          <div class="pres-divider"></div>
        ` : ''}
        <button class="pres-btn" id="ldoc-btn-zoom-out" title="Zoom Out (-)">−</button>
        <span class="pres-pill" id="ldoc-pres-zoom-lbl" style="min-width:44px; justify-content:center">${zoomPct}%</span>
        <button class="pres-btn" id="ldoc-btn-zoom-in" title="Zoom In (+)">＋</button>
        <button class="pres-btn" id="ldoc-btn-fit" title="Fit to Screen (0)">FIT</button>
        <div class="pres-divider"></div>
        <button class="pres-btn" id="ldoc-btn-fs" title="Toggle Fullscreen (F11)">${this.state.isFullscreen ? '⤢ Exit FS' : '⛶ Fullscreen'}</button>
        <button class="pres-btn danger" id="ldoc-btn-exit" title="Exit Presentation (Esc)">✕ Exit</button>
      `;

      // Attach button clicks
      const prevBtn = controls.querySelector('#ldoc-btn-prev');
      if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); this.prevPage(); };
      const nextBtn = controls.querySelector('#ldoc-btn-next');
      if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); this.nextPage(); };

      const zoomOutBtn = controls.querySelector('#ldoc-btn-zoom-out');
      if (zoomOutBtn) zoomOutBtn.onclick = (e) => { e.stopPropagation(); this.zoomOut(); };
      const zoomInBtn = controls.querySelector('#ldoc-btn-zoom-in');
      if (zoomInBtn) zoomInBtn.onclick = (e) => { e.stopPropagation(); this.zoomIn(); };
      const fitBtn = controls.querySelector('#ldoc-btn-fit');
      if (fitBtn) fitBtn.onclick = (e) => { e.stopPropagation(); this.fitToScreen(); };

      const fsBtn = controls.querySelector('#ldoc-btn-fs');
      if (fsBtn) fsBtn.onclick = (e) => { e.stopPropagation(); this.toggleFullscreen(); };
      const exitBtn = controls.querySelector('#ldoc-btn-exit');
      if (exitBtn) exitBtn.onclick = (e) => { e.stopPropagation(); this.exit(); };
    }

    _updateControls() {
      if (typeof document === 'undefined') return;
      const counter = document.getElementById('ldoc-pres-counter');
      if (counter) counter.textContent = `${this.state.page} / ${this.state.totalPages}`;

      const zoomLbl = document.getElementById('ldoc-pres-zoom-lbl');
      if (zoomLbl) zoomLbl.textContent = `${Math.round(this.state.zoom * 100)}%`;

      const fsBtn = document.getElementById('ldoc-btn-fs');
      if (fsBtn) fsBtn.textContent = this.state.isFullscreen ? '⤢ Exit FS' : '⛶ Fullscreen';
    }

    _resetInactivityTimer() {
      if (typeof document === 'undefined') return;
      const controls = document.getElementById('ldoc-pres-controls');
      if (controls) controls.classList.remove('faded');

      if (this._inactivityTimer) clearTimeout(this._inactivityTimer);
      this._inactivityTimer = setTimeout(() => {
        if (this.state.active && controls && !this._isPanning) {
          controls.classList.add('faded');
        }
      }, 2500);
    }

    // ── KEYBOARD SHORTCUT ROUTER ──
    _handleKeyDown(e) {
      if (!this.state.active) {
        // Global Entry Shortcut: Ctrl + F5
        if (e.ctrlKey && e.key === 'F5') {
          // Check if typing in editable area
          const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
          const isTyping = activeEl && (
            activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.isContentEditable ||
            activeEl.classList.contains('monaco-editor')
          );
          if (!isTyping) {
            e.preventDefault();
            e.stopPropagation();
            this.enter();
          }
        }
        return;
      }

      // Check if user is typing into an interactive document form/quiz input
      const target = e.target;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // ESC: always exits presentation or active menu
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.exit();
        return;
      }

      // If user is currently typing text into an interactive element, allow typing through
      if (isInput) return;

      this._resetInactivityTimer();

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          this.nextPage();
          break;
        case ' ': // Spacebar
          if (!this._isSpacePressed) {
            this._isSpacePressed = true;
            e.preventDefault();
            this.nextPage();
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          this.prevPage();
          break;
        case 'Home':
          e.preventDefault();
          this.goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          this.goToPage(this.state.totalPages);
          break;
        case '+':
        case '=':
          e.preventDefault();
          this.zoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          this.zoomOut();
          break;
        case '0':
          e.preventDefault();
          this.fitToScreen();
          break;
        case '1':
          e.preventDefault();
          this.zoom100();
          break;
        case 'f':
        case 'F':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            this.toggleFullscreen();
          }
          break;
      }
    }

    _handleKeyUp(e) {
      if (e.key === ' ') {
        this._isSpacePressed = false;
      }
    }

    // ── MOUSE / PAN / GESTURE ROUTER ──
    _handleMouseMove(e) {
      if (!this.state.active) return;
      this._resetInactivityTimer();

      // Pan dragging
      if (this._isPanning) {
        const dx = e.clientX - this._panStartX;
        const dy = e.clientY - this._panStartY;
        this.state.panX = this._initialPanX + dx;
        this.state.panY = this._initialPanY + dy;
        this._applyTransform();
      }

      // Check contextual 3D block hovering
      if (typeof document !== 'undefined') {
        const underCursor = document.elementFromPoint(e.clientX, e.clientY);
        if (underCursor) {
          const threeBlock = underCursor.closest('.block[data-type="3d_model"], .block-3d-model, [data-block-type="3d_model"]');
          if (threeBlock) {
            this._show3DContextualTools(threeBlock);
          } else {
            this._hide3DContextualTools();
          }
        }
      }
    }

    _handleMouseDown(e) {
      if (!this.state.active) return;

      // Middle-mouse drag (button 1) or Space + Left-mouse drag
      if (e.button === 1 || (e.button === 0 && e.spaceKey) || (e.button === 0 && this._isSpacePressed)) {
        // Verify not clicking an interactive document control
        const target = e.target;
        if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('#ldoc-pres-controls'))) {
          return;
        }
        e.preventDefault();
        this._isPanning = true;
        this._panStartX = e.clientX;
        this._panStartY = e.clientY;
        this._initialPanX = this.state.panX;
        this._initialPanY = this.state.panY;
        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'grab';
        }
      }
    }

    _handleMouseUp(e) {
      if (this._isPanning) {
        this._isPanning = false;
        if (typeof document !== 'undefined') {
          document.body.style.cursor = '';
        }
      }
    }

    _handleWheel(e) {
      if (!this.state.active) return;

      // Ctrl + Wheel: Zoom toward cursor
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        this.setZoom(this.state.zoom * factor);
      }
    }

    _handleWindowResize() {
      if (!this.state.active) return;
      this.fitToScreen();
    }

    // ── CONTEXTUAL 3D TOOLS ──
    _show3DContextualTools(threeBlock) {
      if (typeof document === 'undefined') return;
      let tools = document.getElementById('ldoc-pres-3d-tools');
      if (!tools) {
        tools = document.createElement('div');
        tools.id = 'ldoc-pres-3d-tools';
        document.body.appendChild(tools);
      }

      tools.innerHTML = `
        <button class="pres-btn" id="pres-3d-reset" title="Reset Camera View">↻ Reset Cam</button>
        <button class="pres-btn" id="pres-3d-explode" title="Toggle Exploded Assembly">◉ Exploded</button>
      `;

      const resetBtn = tools.querySelector('#pres-3d-reset');
      if (resetBtn) {
        resetBtn.onclick = (e) => {
          e.stopPropagation();
          const canvas = threeBlock.querySelector('canvas');
          if (canvas && canvas.__orbitControls) {
            canvas.__orbitControls.reset();
          } else if (typeof window !== 'undefined' && typeof window.reset3DCamera === 'function') {
            window.reset3DCamera(threeBlock.id);
          }
        };
      }

      const explodeBtn = tools.querySelector('#pres-3d-explode');
      if (explodeBtn) {
        explodeBtn.onclick = (e) => {
          e.stopPropagation();
          if (typeof window !== 'undefined' && typeof window.toggleExplodedView === 'function') {
            window.toggleExplodedView(threeBlock.id);
          }
        };
      }

      tools.classList.add('visible');
    }

    _hide3DContextualTools() {
      if (typeof document === 'undefined') return;
      const tools = document.getElementById('ldoc-pres-3d-tools');
      if (tools) tools.classList.remove('visible');
    }

    // ── DEEP LINK AUTO-LAUNCH ──
    _autoLaunchIfRequested() {
      if (typeof window === 'undefined' || !window.location) return;
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('presentation') === 'true' || urlParams.get('present') === 'true') {
        const fullscreen = urlParams.get('fullscreen') === 'true';
        const onReady = () => {
          setTimeout(() => {
            this.enter({ fullscreen });
          }, 300);
        };
        if (typeof document !== 'undefined') {
          if (document.readyState === 'complete') {
            onReady();
          } else {
            window.addEventListener('load', onReady);
          }
        }
      }
    }
  }

  // ── SINGLETON EXPOSURE ──
  const instance = new LDocPresentationRuntime();
  global.LDocPresentationRuntime = LDocPresentationRuntime;
  global.ldocPresentation = instance;

  // Global helper shortcuts
  global.enterPresentationMode = (opts) => instance.enter(opts);
  global.exitPresentationMode = () => instance.exit();
  global.togglePresentationMode = (opts) => instance.toggle(opts);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LDocPresentationRuntime, ldocPresentation: instance };
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
