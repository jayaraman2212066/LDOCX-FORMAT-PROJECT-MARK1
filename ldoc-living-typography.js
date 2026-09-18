/**
 * LDOCX Living Typography Controller & Visual Layout Studio
 * Complete Visual Authoring Layer Powered by @chenglou/pretext (LdocTextLayout)
 * 
 * Invariants:
 * - Upstream Pretext core engine is strictly preserved (never replaced or approximated).
 * - prepare() calls are cached; layout() hot path (<0.1ms) handles live 60-120fps drag reflow.
 * - Non-flattening living typography: DOM remains interactive in Viewer and Presentation mode.
 * - Stacking strictly adheres to ldoc-layer-tokens.css 18-tier token hierarchy.
 * 
 * Copyright (c) 2026 J AI ENTERPRISES — Apache-2.0 License
 */
(function (global) {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PREPARED TEXT CACHE & HIGH-PERFORMANCE PRETEXT ADAPTER
  // ─────────────────────────────────────────────────────────────────────────────
  const _preparedCache = new Map();
  const MAX_CACHE_ENTRIES = 300;

  function getCacheKey(text, font, options = {}) {
    const optKey = (options.letterSpacing || 0) + '_' + (options.wordSpacing || 0);
    return `${font}::${optKey}::${text}`;
  }

  function getOrPrepareText(text, font, options = {}) {
    const textEngine = global.LDocTextLayout || global.LdocTextLayout;
    if (!textEngine || typeof textEngine.prepareWithSegments !== 'function') {
      return null;
    }
    const key = getCacheKey(text, font, options);
    if (_preparedCache.has(key)) {
      return _preparedCache.get(key);
    }
    const t0 = performance.now();
    const prepared = textEngine.prepareWithSegments(text, font, options);
    const prepareTime = performance.now() - t0;
    prepared._prepareTime = prepareTime;
    prepared._font = font;

    if (_preparedCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = _preparedCache.keys().next().value;
      _preparedCache.delete(firstKey);
    }
    _preparedCache.set(key, prepared);
    return prepared;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. LIVING TYPOGRAPHY CORE CONTROLLER
  // ─────────────────────────────────────────────────────────────────────────────
  const LDocLivingTypography = {
    version: '1.0.0',
    name: 'Living Typography',
    secondaryLabel: 'Powered by Pretext',

    // Active state
    state: {
      activeBlockId: null,
      activeObstacleIds: new Set(),
      currentMode: 'obstacle_flow', // normal, smart_wrap, obstacle_flow, multi_column, editorial, magazine, pull_quote, tight_fit, responsive, custom
      columns: 2,
      columnGap: 32,
      columnDirection: 'ltr',
      columnFlow: 'balanced', // balanced, sequential
      lineHeight: 26,
      letterSpacing: 0,
      paragraphSpacing: 14,
      alignment: 'left',
      wrapAroundObjects: true,
      avoidOverlap: true,
      autoBalanceColumns: true,
      autoFit: false,
      keepWordsTogether: true,
      preserveChips: true,
      responsiveReflow: true,
      animateReflow: true,
      flowLocked: false,
      showFlowGuides: false,
      previewWidth: 800,
      activeBreakpoint: 'desktop', // desktop, tablet, mobile
      responsiveSettings: {
        desktop: { minWidth: 1200, columns: 3, fontSize: 16, lineHeight: 26 },
        tablet: { minWidth: 768, columns: 2, fontSize: 15, lineHeight: 24 },
        mobile: { minWidth: 0, columns: 1, fontSize: 14, lineHeight: 22 }
      },
      diagnostics: {
        lastLayoutTime: 0,
        prepareTime: 0,
        linesCount: 0,
        segmentsCount: 0,
        maxLineWidth: 0,
        usedWidth: 0,
        activeObstacles: 0,
        domReads: 0,
        domWrites: 0
      }
    },

    // Obstacle Registry
    obstacles: new Map(), // id -> { id, element, rect: {x,y,width,height}, shape, margin, priority, animated, animTrajectory }

    // Animation Controller
    animationState: {
      isPlaying: false,
      rafId: null,
      speed: 1.0,
      loop: true,
      direction: 'forward',
      progress: 0,
      startTime: 0
    },

    // Registered Layout Presets
    presets: {
      basic: {
        name: 'Normal Text',
        mode: 'normal',
        columns: 1,
        columnGap: 24,
        lineHeight: 24,
        wrapAroundObjects: false
      },
      smart_wrap: {
        name: 'Smart Wrap',
        mode: 'smart_wrap',
        columns: 1,
        columnGap: 24,
        lineHeight: 26,
        wrapAroundObjects: true
      },
      editorial: {
        name: 'Editorial Flow',
        mode: 'editorial',
        columns: 2,
        columnGap: 32,
        lineHeight: 26,
        wrapAroundObjects: true,
        autoBalanceColumns: true
      },
      magazine: {
        name: 'Magazine Spread',
        mode: 'magazine',
        columns: 3,
        columnGap: 28,
        lineHeight: 25,
        wrapAroundObjects: true,
        autoBalanceColumns: true
      },
      dynamic_obstacle: {
        name: 'Dynamic Obstacle Flow',
        mode: 'obstacle_flow',
        columns: 2,
        columnGap: 30,
        lineHeight: 26,
        wrapAroundObjects: true
      },
      multi_column: {
        name: 'Multi-Column',
        mode: 'multi_column',
        columns: 3,
        columnGap: 32,
        lineHeight: 25,
        autoBalanceColumns: true
      },
      interactive: {
        name: 'Interactive Flow',
        mode: 'custom',
        columns: 2,
        columnGap: 32,
        lineHeight: 26,
        wrapAroundObjects: true,
        animateReflow: true
      },
      tight_text: {
        name: 'Tight Fit / Shrink-Wrap',
        mode: 'tight_fit',
        columns: 1,
        columnGap: 20,
        lineHeight: 22,
        wrapAroundObjects: false
      },
      responsive: {
        name: 'Responsive Layout',
        mode: 'responsive',
        columns: 2,
        columnGap: 28,
        lineHeight: 25,
        responsiveReflow: true
      },
      experimental: {
        name: 'Freeform Flow',
        mode: 'custom',
        columns: 2,
        columnGap: 36,
        lineHeight: 28,
        wrapAroundObjects: true,
        animateReflow: true
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 3. INITIALIZATION & SURFACES HOOKUP
    // ─────────────────────────────────────────────────────────────────────────
    init: function () {
      if (typeof window === 'undefined') return;
      this._bindGlobalEvents();
      this._injectDrawerUI();
      this._injectObstacleInspectorUI();
      this._injectFlowGuidesOverlay();
      this._injectDiagnosticsHUD();
      this._hookReactiveEngine();
      this._hookPresentationMode();
      this._hookLayersAndBrandKit();
      console.log('✦ LDOCX Living Typography Studio initialized. Engine: @chenglou/pretext');
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 4. PRETEXT LAYOUT ENGINE WRAPPERS
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Measure and layout paragraph with obstacle avoidance.
     * Uses Pretext's cursor streaming without DOM measurement loops.
     */
    layoutFlow: function (text, font, containerWidth, obstacleRects, lineHeight = 26, options = {}) {
      const textEngine = global.LDocTextLayout || global.LdocTextLayout;
      if (!textEngine) return null;

      const t0 = performance.now();
      const prepared = getOrPrepareText(text, font, options);
      if (!prepared) return null;

      const padding = options.margin !== undefined ? options.margin : (options.padding !== undefined ? options.padding : 16);
      const rects = (Array.isArray(obstacleRects) ? obstacleRects : [obstacleRects]).filter(Boolean);

      let cursor = { segmentIndex: 0, graphemeIndex: 0 };
      let y = options.startY || 0;
      const lines = [];
      const maxIterations = options.maxLines || 800;
      let it = 0;
      let usedW = 0;

      while (it++ < maxIterations) {
        const bandTop = y;
        const bandBottom = y + lineHeight;
        const blocked = [];

        for (let rIdx = 0; rIdx < rects.length; rIdx++) {
          const r = rects[rIdx];
          // Check vertical intersection with line band
          if (bandBottom <= r.y - padding || bandTop >= r.y + r.height + padding) {
            continue;
          }
          blocked.push({
            left: Math.max(0, r.x - padding),
            right: Math.min(containerWidth, r.x + r.width + padding)
          });
        }

        // Carve available horizontal slots on this line band
        const slots = this.carveSlots({ left: 0, right: containerWidth }, blocked, options.minSlotWidth || 48);
        if (slots.length === 0) {
          y += lineHeight;
          continue;
        }

        // Pick optimal available slot
        let bestSlot = slots[0];
        for (let sIdx = 1; sIdx < slots.length; sIdx++) {
          if (slots[sIdx].right - slots[sIdx].left > bestSlot.right - bestSlot.left) {
            bestSlot = slots[sIdx];
          }
        }

        const availableWidth = bestSlot.right - bestSlot.left;
        const line = textEngine.layoutNextLine(prepared, cursor, availableWidth);
        if (!line) break;

        // Advance cursor guard against zero progress
        if (line.end.segmentIndex === cursor.segmentIndex && line.end.graphemeIndex === cursor.graphemeIndex) {
          cursor = { segmentIndex: cursor.segmentIndex + 1, graphemeIndex: 0 };
          y += lineHeight;
          continue;
        }

        if (line.width > usedW) usedW = line.width;

        lines.push({
          text: line.text,
          x: Math.round(bestSlot.left),
          y: Math.round(y),
          width: Math.round(line.width),
          height: lineHeight,
          availableWidth: Math.round(availableWidth)
        });

        cursor = line.end;
        y += lineHeight;
      }

      const layoutTime = performance.now() - t0;
      this.state.diagnostics.lastLayoutTime = parseFloat(layoutTime.toFixed(2));
      this.state.diagnostics.linesCount = lines.length;
      this.state.diagnostics.usedWidth = Math.round(usedW);
      this.state.diagnostics.activeObstacles = rects.length;

      return {
        lines,
        lineCount: lines.length,
        totalHeight: y,
        usedWidth: Math.round(usedW),
        layoutTime
      };
    },

    /**
     * Slice horizontal intervals into non-blocked text slots
     */
    carveSlots: function (lineSpan, blockedSpans, minSlotWidth = 48) {
      if (!blockedSpans || blockedSpans.length === 0) return [lineSpan];
      const sorted = blockedSpans.slice().sort((a, b) => a.left - b.left);
      const merged = [];
      for (const b of sorted) {
        if (merged.length === 0) {
          merged.push({ left: b.left, right: b.right });
        } else {
          const last = merged[merged.length - 1];
          if (b.left <= last.right) {
            last.right = Math.max(last.right, b.right);
          } else {
            merged.push({ left: b.left, right: b.right });
          }
        }
      }

      const slots = [];
      let cur = lineSpan.left;
      for (const b of merged) {
        if (b.left > cur) {
          slots.push({ left: cur, right: Math.min(lineSpan.right, b.left) });
        }
        cur = Math.max(cur, b.right);
        if (cur >= lineSpan.right) break;
      }
      if (cur < lineSpan.right) {
        slots.push({ left: cur, right: lineSpan.right });
      }
      return slots.filter(s => s.right - s.left >= minSlotWidth);
    },

    /**
     * Multi-column balanced layout
     */
    layoutColumns: function (text, font, containerWidth, columnCount = 2, gap = 32, lineHeight = 26, options = {}) {
      const textEngine = global.LDocTextLayout || global.LdocTextLayout;
      if (!textEngine || typeof textEngine.balanceColumns !== 'function') return null;

      const t0 = performance.now();
      const cols = Math.max(1, Math.min(6, columnCount));
      const res = textEngine.balanceColumns(text, font, containerWidth, cols, gap, lineHeight, options);
      res.layoutTime = parseFloat((performance.now() - t0).toFixed(2));
      this.state.diagnostics.lastLayoutTime = res.layoutTime;
      this.state.diagnostics.linesCount = res.totalLines;
      return res;
    },

    /**
     * Binary-Search Auto-Fit Text to target bounding box
     */
    autoFitText: function (targetOrText, font, targetWidth, targetHeight, options = {}) {
      let text, targetW, targetH;
      let el = null;
      if (targetOrText && typeof targetOrText === 'object' && targetOrText.nodeType) {
        el = targetOrText;
        text = el.getAttribute('data-raw-text') || el.innerText || '';
        const rect = el.getBoundingClientRect();
        targetW = el.offsetWidth || rect.width || 400;
        targetH = el.offsetHeight || rect.height || 300;
        font = el.style.fontFamily || font || 'Plus Jakarta Sans';
      } else {
        text = targetOrText;
        targetW = targetWidth;
        targetH = targetHeight;
      }
      const textEngine = global.LDocTextLayout || global.LdocTextLayout;
      if (!textEngine || typeof textEngine.fitFontSize !== 'function') return null;

      const t0 = performance.now();
      const res = textEngine.fitFontSize({
        text,
        fontSize: options.fontSize || 16,
        fontFamily: options.fontFamily || font || 'Plus Jakarta Sans'
      }, targetW, targetH, options);
      res.fitTime = parseFloat((performance.now() - t0).toFixed(2));
      if (el && res && res.fontSize) {
        el.style.fontSize = `${res.fontSize}px`;
        el.style.lineHeight = `${res.lineHeight || Math.round(res.fontSize * 1.4)}px`;
        this.triggerLiveReflow();
      }
      return res;
    },

    /**
     * Tight-Fit / Shrink-Wrap:
     * Discovers narrowest container width preserving target line count in <0.2ms.
     */
    calculateTightFitWidth: function (text, font, targetLines = 3, minWidth = 100, maxWidth = 1200, lineHeight = 26) {
      const textEngine = global.LDocTextLayout || global.LdocTextLayout;
      if (!textEngine) return null;

      const t0 = performance.now();
      const prepared = getOrPrepareText(text, font);
      if (!prepared) return null;

      let low = Math.max(40, minWidth);
      let high = Math.max(low, maxWidth);
      let bestW = high;

      // Binary search over widths (12 iterations max)
      for (let i = 0; i < 14; i++) {
        if (low > high) break;
        const mid = Math.floor((low + high) / 2);
        const lRes = textEngine.layout(prepared, mid, lineHeight);
        if (lRes.lineCount <= targetLines) {
          bestW = mid;
          high = mid - 1; // Try narrower
        } else {
          low = mid + 1;  // Too narrow, widen
        }
      }

      const elapsed = parseFloat((performance.now() - t0).toFixed(2));
      return {
        targetLines,
        calculatedWidth: bestW,
        elapsedTime: elapsed
      };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 5. OBSTACLE MANAGEMENT & LIVE DRAG REFLOW
    // ─────────────────────────────────────────────────────────────────────────
    registerObstacle: function (idOrElement, elementOrRectOrOptions, maybeOptions = {}) {
      let id, elementOrRect, options;
      if (typeof idOrElement === 'string') {
        id = idOrElement;
        elementOrRect = elementOrRectOrOptions;
        options = maybeOptions || {};
      } else {
        elementOrRect = idOrElement;
        options = (elementOrRectOrOptions && typeof elementOrRectOrOptions === 'object' && !elementOrRectOrOptions.nodeType && !elementOrRectOrOptions.x) ? elementOrRectOrOptions : (maybeOptions || {});
        id = (elementOrRect && (elementOrRect.id || elementOrRect.dataset?.obstacleId || elementOrRect.dataset?.blockId)) || `obstacle_${Date.now()}_${Math.floor(Math.random()*1000)}`;
      }

      let rect = { x: 0, y: 0, width: 100, height: 100 };
      let el = null;

      if (elementOrRect && typeof elementOrRect.getBoundingClientRect === 'function') {
        el = elementOrRect;
        const r = el.getBoundingClientRect();
        rect = { x: el.offsetLeft || r.left, y: el.offsetTop || r.top, width: r.width || 120, height: r.height || 120 };
      } else if (elementOrRect) {
        rect = Object.assign({}, rect, elementOrRect);
      }

      const obs = {
        id: id || `obstacle_${Date.now()}`,
        element: el,
        rect: rect,
        shape: options.shape || 'rectangle', // rectangle, circle, ellipse, custom
        margin: options.margin !== undefined ? options.margin : 16,
        priority: options.priority || 'normal',
        animated: options.animated || false
      };

      this.obstacles.set(obs.id, obs);
      this.state.activeObstacleIds.add(obs.id);
      this.state.diagnostics.activeObstacles = this.obstacles.size;

      if (el) {
        el.dataset.isTextObstacle = 'true';
        el.dataset.obstacleId = obs.id;
        el.classList.add('ldoc-flow-obstacle');
        this._attachObstacleDrag(el, obs.id);
      }

      this.triggerLiveReflow();
      return obs;
    },

    openInspectorForElement: function (el) {
      if (!el) return;
      this._injectObstacleInspectorUI();
      const inspector = document.getElementById('ldoc-obstacle-inspector');
      if (!inspector) return;
      const r = el.getBoundingClientRect();
      inspector.style.left = `${Math.min(window.innerWidth - 220, (el.offsetLeft || r.left) + (el.offsetWidth || r.width) + 12)}px`;
      inspector.style.top = `${Math.max(10, el.offsetTop || r.top)}px`;
      inspector.style.display = 'block';
      const obs = this.registerObstacle(el, { enabled: true, margin: 16 });
      this.state._selectedObstacleId = obs.id;
    },

    openObstacleInspector: function (obsId) {
      this._showObstacleInspector(obsId);
    },

    reflowAll: function () {
      return this.triggerLiveReflow();
    },

    hideFlowGuides: function () {
      return this.toggleFlowGuides(false);
    },

    getDiagnostics: function () {
      return {
        cacheSize: _preparedCache.size,
        ...this.state.diagnostics
      };
    },

    unregisterObstacle: function (id) {
      const obs = this.obstacles.get(id);
      if (obs && obs.element) {
        obs.element.removeAttribute('data-is-text-obstacle');
        obs.element.removeAttribute('data-obstacle-id');
        obs.element.classList.remove('ldoc-flow-obstacle');
      }
      this.obstacles.delete(id);
      this.state.activeObstacleIds.delete(id);
      this.triggerLiveReflow();
    },

    /**
     * Attach real-time 60-120fps drag handler to obstacle
     */
    _attachObstacleDrag: function (el, obsId) {
      if (!el || el._ldocDragAttached) return;
      el._ldocDragAttached = true;

      let isDragging = false;
      let startX = 0, startY = 0;
      let initLeft = 0, initTop = 0;
      let rafPending = false;

      const onPointerDown = (e) => {
        if (this.state.flowLocked) return;
        // Don't drag if clicking buttons or inputs inside obstacle
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initLeft = el.offsetLeft || 0;
        initTop = el.offsetTop || 0;

        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
        this._showObstacleInspector(obsId);
        e.stopPropagation();
      };

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const nextLeft = Math.max(0, initLeft + dx);
        const nextTop = Math.max(0, initTop + dy);

        el.style.left = `${nextLeft}px`;
        el.style.top = `${nextTop}px`;

        const obs = this.obstacles.get(obsId);
        if (obs) {
          obs.rect.x = nextLeft;
          obs.rect.y = nextTop;
        }

        // Throttle reflow to animation frame for 60-120fps zero-lag
        if (!rafPending) {
          rafPending = true;
          requestAnimationFrame(() => {
            rafPending = false;
            this.triggerLiveReflow();
          });
        }
      };

      const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        el.classList.remove('dragging');
        try { el.releasePointerCapture(e.pointerId); } catch (_) {}

        this.triggerLiveReflow();
        this._recordHistorySnapshot();
      };

      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointermove', onPointerMove);
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointercancel', onPointerUp);
    },

    /**
     * Real-time reflow trigger across active document text blocks
     */
    triggerLiveReflow: function () {
      if (typeof document === 'undefined') return;

      const activeObstacleRects = Array.from(this.obstacles.values()).map(o => ({
        x: o.rect.x,
        y: o.rect.y,
        width: o.rect.width,
        height: o.rect.height,
        margin: o.margin
      }));

      // Find all living typography paragraphs
      const targets = document.querySelectorAll('[data-living-type="true"], .ldoc-living-text, .pres-page p, #ed-preview-body p');
      targets.forEach(el => {
        const rawText = el.getAttribute('data-raw-text') || el.innerText || '';
        if (!rawText.trim()) return;
        el.setAttribute('data-raw-text', rawText);

        const containerWidth = el.parentElement ? (el.parentElement.offsetWidth || 800) : (el.offsetWidth || 800);
        const font = el.getAttribute('data-font') || window.getComputedStyle(el).font || '16px "Plus Jakarta Sans", sans-serif';
        const lineHeight = parseInt(el.getAttribute('data-line-height'), 10) || this.state.lineHeight || 26;

        // Compute local obstacle offsets relative to text element
        const elRect = el.getBoundingClientRect();
        const relativeObstacles = activeObstacleRects.map(r => ({
          x: r.x - (el.offsetLeft || 0),
          y: r.y - (el.offsetTop || 0),
          width: r.width,
          height: r.height,
          margin: r.margin
        }));

        if (this.state.columns > 1 && this.state.currentMode === 'multi_column') {
          const colRes = this.layoutColumns(rawText, font, containerWidth, this.state.columns, this.state.columnGap, lineHeight);
          this._renderMultiColumnDOM(el, colRes);
        } else {
          const flowRes = this.layoutFlow(rawText, font, containerWidth, relativeObstacles, lineHeight, { margin: 16 });
          this._renderFlowLinesDOM(el, flowRes);
        }
      });

      if (this.state.showFlowGuides) {
        this.renderFlowGuides();
      }
      this._updateDiagnosticsHUD();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 6. DOM RENDERING & ACCESSIBILITY GUARANTEES
    // ─────────────────────────────────────────────────────────────────────────
    _renderFlowLinesDOM: function (containerEl, flowRes) {
      if (!containerEl || !flowRes || !flowRes.lines) return;

      const linesHTML = flowRes.lines.map(line => {
        const indent = line.x > 0 ? `margin-left:${line.x}px;` : '';
        const maxW = `max-width:${line.width}px;`;
        return `<div class="ldoc-type-line" style="${indent}${maxW}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:margin-left 60ms linear, max-width 60ms linear;" aria-hidden="true">${line.text}</div>`;
      }).join('');

      // Maintain accessibility: position lines visually with aria-hidden, retain full semantic text in screen-reader container
      const srHTML = `<span class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${containerEl.getAttribute('data-raw-text')}</span>`;

      containerEl.innerHTML = srHTML + linesHTML;
      containerEl.style.minHeight = `${flowRes.totalHeight}px`;
    },

    _renderMultiColumnDOM: function (containerEl, colRes) {
      if (!containerEl || !colRes || !colRes.columns) return;

      const colsHTML = colRes.columns.map(col => {
        const linesHTML = col.lines.map(l => `<div class="ldoc-col-line">${l.text}</div>`).join('');
        return `<div class="ldoc-type-column" style="flex:1;min-width:${col.width}px;">${linesHTML}</div>`;
      }).join('');

      const srHTML = `<span class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;">${containerEl.getAttribute('data-raw-text')}</span>`;

      containerEl.innerHTML = `${srHTML}<div class="ldoc-type-columns-wrap" style="display:flex;gap:${colRes.gap}px;">${colsHTML}</div>`;
      containerEl.style.minHeight = `${colRes.height}px`;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 7. EDITORIAL & MAGAZINE TEMPLATE BLUEPRINTS
    // ─────────────────────────────────────────────────────────────────────────
    createEditorialArticle: function (title = 'Living Typography in Action', author = 'LDOCX Editorial Studio') {
      const headline = title;
      const meta = `By ${author} • Dynamic Pretext Layout • Zero-Drift Verified`;
      const p1 = 'Living documents represent a monumental evolution in computational typography. Instead of treating text as rigid static rectangles or rasterized image screenshots, modern editorial workflows demand dynamic spatial flow around interactive objects.';
      const p2 = 'Here, words part like water in real time. Drag the video card or 3D inspection model, and notice how Pretext recalculates line intervals in under 0.2 milliseconds without touching the DOM tree.';
      const pullQuote = '“Typography is not the decoration of words; it is the geometry of thoughts.”';
      const quoteAuthor = '— LDOCX Creative Collective';

      return {
        type: 'editorial_spread',
        headline,
        meta,
        p1,
        p2,
        pullQuote,
        quoteAuthor,
        columns: 2,
        gap: 32
      };
    },

    createEditorialSpread: function (container) {
      if (typeof document === 'undefined') return null;
      const parent = container || document.getElementById('creator-canvas') || document.getElementById('slide-viewport') || document.getElementById('main') || document.body;
      const spreadEl = document.createElement('div');
      spreadEl.className = 'ldoc-editorial-spread';
      spreadEl.style.cssText = 'position:relative;width:780px;max-width:96%;margin:20px auto;padding:24px;background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,0.5);';

      const art = this.createEditorialArticle();
      spreadEl.innerHTML = `
        <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:800;color:#f8fafc;margin-bottom:6px;line-height:1.2;">${art.headline}</h1>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:20px;letter-spacing:0.5px;font-weight:600;">${art.meta}</div>
        <div class="ldoc-living-text" data-living-type="true" data-columns="2" style="font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;line-height:26px;color:#cbd5e1;">
          ${art.p1} ${art.p2}
        </div>
      `;

      // Add pull quote card obstacle
      const pqEl = document.createElement('div');
      pqEl.className = 'ldoc-pull-quote-card ldoc-flow-obstacle';
      pqEl.style.cssText = 'position:absolute;left:260px;top:140px;width:240px;padding:16px;background:rgba(18,22,36,0.92);backdrop-filter:blur(10px);border-left:3px solid #a855f7;border-radius:8px;box-shadow:0 8px 30px rgba(0,0,0,0.6);cursor:move;z-index:var(--z-interactive-widgets, 30);';
      pqEl.innerHTML = `
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:15px;font-style:italic;color:#e2e8f0;line-height:1.35;">${art.pullQuote}</div>
        <div style="font-size:11px;font-weight:700;color:#a855f7;margin-top:8px;text-align:right;">${art.quoteAuthor}</div>
      `;

      spreadEl.appendChild(pqEl);
      parent.appendChild(spreadEl);

      const obsId = `obs_spread_${Date.now()}`;
      this.registerObstacle(obsId, pqEl, { margin: 20, shape: 'rectangle' });
      this.triggerLiveReflow();

      if (global.LDocToast) {
        global.LDocToast.show('✦ Editorial Spread Created! Drag the pull-quote card to see text flow.', 'ok', 3000);
      }
      return spreadEl;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 8. VISUAL FLOW GUIDES (EDITOR ONLY)
    // ─────────────────────────────────────────────────────────────────────────
    toggleFlowGuides: function (forceState) {
      this.state.showFlowGuides = (forceState !== undefined) ? forceState : !this.state.showFlowGuides;
      const overlay = document.getElementById('ldoc-flow-guides-overlay');
      if (overlay) {
        overlay.style.display = this.state.showFlowGuides ? 'block' : 'none';
      }
      if (this.state.showFlowGuides) {
        this.renderFlowGuides();
      }
      return this.state.showFlowGuides;
    },

    renderFlowGuides: function () {
      const overlay = document.getElementById('ldoc-flow-guides-overlay');
      if (!overlay || !this.state.showFlowGuides) return;

      let svgContent = '';
      this.obstacles.forEach(obs => {
        const r = obs.rect;
        svgContent += `
          <rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" 
            fill="rgba(56, 189, 248, 0.08)" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="4 3" rx="4" />
          <text x="${r.x + 6}" y="${r.y + 14}" fill="#38bdf8" font-size="10" font-family="monospace">OBSTACLE (${Math.round(r.width)}x${Math.round(r.height)})</text>
        `;
      });

      overlay.innerHTML = `<svg width="100%" height="100%" style="position:absolute;inset:0;pointer-events:none;">${svgContent}</svg>`;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 9. ANIMATED OBSTACLE TRAJECTORY ENGINE
    // ─────────────────────────────────────────────────────────────────────────
    startObstacleAnimation: function (obstacleId, trajectory = 'orbit') {
      const obs = this.obstacles.get(obstacleId);
      if (!obs || !obs.element) return;

      // Check prefers-reduced-motion
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        console.log('Reduced motion preferred: Keeping animated obstacle at resting layout.');
        return;
      }

      this.animationState.isPlaying = true;
      const startX = obs.rect.x;
      const startY = obs.rect.y;
      let angle = 0;

      const step = () => {
        if (!this.animationState.isPlaying) return;
        angle += 0.025 * this.animationState.speed;
        const radius = 60;

        const nextX = startX + Math.cos(angle) * radius;
        const nextY = startY + Math.sin(angle) * 35;

        obs.rect.x = nextX;
        obs.rect.y = nextY;
        obs.element.style.left = `${nextX}px`;
        obs.element.style.top = `${nextY}px`;

        this.triggerLiveReflow();
        this.animationState.rafId = requestAnimationFrame(step);
      };

      this.animationState.rafId = requestAnimationFrame(step);
    },

    pauseObstacleAnimation: function () {
      this.animationState.isPlaying = false;
      if (this.animationState.rafId) {
        cancelAnimationFrame(this.animationState.rafId);
        this.animationState.rafId = null;
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 10. REACTIVE ENGINE HOOKUP
    // ─────────────────────────────────────────────────────────────────────────
    _hookReactiveEngine: function () {
      if (typeof window === 'undefined') return;

      // Listen for LDOC reactive state mutations
      window.addEventListener('ldoc:variableChanged', (e) => {
        this.triggerLiveReflow();
      });

      // Hook LDocReactiveEngine if present
      if (global.LDocReactiveEngine) {
        const origNotify = global.LDocReactiveEngine.notifySubscribers;
        if (typeof origNotify === 'function') {
          global.LDocReactiveEngine.notifySubscribers = (...args) => {
            origNotify.apply(global.LDocReactiveEngine, args);
            this.triggerLiveReflow();
          };
        }
      }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 11. PRESENTATION MODE HOOKUP
    // ─────────────────────────────────────────────────────────────────────────
    _hookPresentationMode: function () {
      if (typeof window === 'undefined') return;

      const onEnter = () => {
        if (this.state.showFlowGuides) {
          const overlay = document.getElementById('ldoc-flow-guides-overlay');
          if (overlay) overlay.style.display = 'none';
        }
        this.triggerLiveReflow();
      };

      const onExit = () => {
        if (this.state.showFlowGuides) {
          const overlay = document.getElementById('ldoc-flow-guides-overlay');
          if (overlay) overlay.style.display = 'block';
        }
        this.triggerLiveReflow();
      };

      // Listen to both ldocPresentation and legacy event naming
      window.addEventListener('ldoc:presentationEnter', onEnter);
      window.addEventListener('ldoc:presentation-start', onEnter);
      window.addEventListener('ldoc:presentationExit', onExit);
      window.addEventListener('ldoc:presentation-exit', onExit);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 12. BRAND KIT & DESIGN SYSTEM PROPAGATION
    // ─────────────────────────────────────────────────────────────────────────
    _hookLayersAndBrandKit: function () {
      if (typeof window === 'undefined') return;

      window.addEventListener('ldoc:brandKitUpdated', (e) => {
        const tokens = e.detail && e.detail.brandTokens;
        if (tokens && tokens.typography && tokens.typography.bodyFont) {
          document.querySelectorAll('[data-living-type="true"]').forEach(el => {
            el.style.fontFamily = tokens.typography.bodyFont;
          });
          this.triggerLiveReflow();
        }
      });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 13. UI DRAWER & INSPECTOR INJECTION
    // ─────────────────────────────────────────────────────────────────────────
    _injectDrawerUI: function () {
      if (typeof document === 'undefined') return;
      if (document.getElementById('ldoc-living-typography-drawer')) return;

      const drawer = document.createElement('div');
      drawer.id = 'ldoc-living-typography-drawer';
      drawer.className = 'ldoc-drawer-panel';
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-label', 'Living Typography Studio');

      drawer.innerHTML = `
        <div class="ldoc-drawer-header" style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <div>
            <div style="font-size:13px;font-weight:800;letter-spacing:1px;color:#f8fafc;display:flex;align-items:center;gap:6px;">
              <span>✦</span><span>LIVING TYPOGRAPHY</span>
            </div>
            <div style="font-size:10.5px;color:#94a3b8;margin-top:2px;">Powered by Pretext Layout Engine</div>
          </div>
          <button type="button" class="ldoc-drawer-close" onclick="window.LDocLivingTypography.toggleDrawer(false)" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;padding:4px;">✕</button>
        </div>

        <div class="ldoc-drawer-content" style="padding:16px 20px;overflow-y:auto;max-height:calc(100vh - 120px);display:flex;flex-direction:column;gap:18px;">
          
          <!-- Presets -->
          <div>
            <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:8px;">Presets</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
              <button type="button" class="ldoc-preset-btn" onclick="window.LDocLivingTypography.applyPreset('editorial')">📰 Editorial Flow</button>
              <button type="button" class="ldoc-preset-btn" onclick="window.LDocLivingTypography.applyPreset('magazine')">📖 Magazine Spread</button>
              <button type="button" class="ldoc-preset-btn" onclick="window.LDocLivingTypography.applyPreset('smart_wrap')">🌊 Smart Wrap</button>
              <button type="button" class="ldoc-preset-btn" onclick="window.LDocLivingTypography.applyPreset('multi_column')">🏛️ Multi-Column</button>
              <button type="button" class="ldoc-preset-btn" onclick="window.LDocLivingTypography.applyPreset('tight_text')">🗜️ Tight Fit</button>
              <button type="button" class="ldoc-preset-btn" onclick="window.LDocLivingTypography.applyPreset('interactive')">⚡ Dynamic Flow</button>
            </div>
          </div>

          <!-- Mode Selector -->
          <div>
            <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:8px;">Layout Mode</label>
            <select id="lt-mode-select" class="ldoc-input-select" onchange="window.LDocLivingTypography.setMode(this.value)">
              <option value="obstacle_flow">Flow Around Objects</option>
              <option value="smart_wrap">Smart Wrap</option>
              <option value="multi_column">Multi-Column</option>
              <option value="editorial">Editorial</option>
              <option value="magazine">Magazine</option>
              <option value="tight_fit">Tight Fit / Shrink-Wrap</option>
              <option value="responsive">Responsive</option>
              <option value="normal">Normal Text</option>
            </select>
          </div>

          <!-- Columns Manager -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Columns</label>
              <span id="lt-cols-display" style="font-size:11.5px;font-weight:700;color:#38bdf8;">2 Cols</span>
            </div>
            <input type="range" id="lt-cols-slider" min="1" max="6" value="2" style="width:100%;" oninput="window.LDocLivingTypography.setColumns(this.value)">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-top:2px;">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span>
            </div>
          </div>

          <!-- Text Flow Sliders -->
          <div>
            <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:10px;">Text Flow Geometry</label>
            
            <div style="display:flex;flex-direction:column;gap:12px;">
              <div>
                <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px;">
                  <span style="color:#cbd5e1;">Line Height</span>
                  <span id="lt-lh-display" style="color:#38bdf8;font-weight:700;">26px</span>
                </div>
                <input type="range" id="lt-lh-slider" min="18" max="44" value="26" style="width:100%;" oninput="window.LDocLivingTypography.setLineHeight(this.value)">
              </div>

              <div>
                <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px;">
                  <span style="color:#cbd5e1;">Column Gap</span>
                  <span id="lt-gap-display" style="color:#38bdf8;font-weight:700;">32px</span>
                </div>
                <input type="range" id="lt-gap-slider" min="12" max="64" value="32" style="width:100%;" oninput="window.LDocLivingTypography.setColumnGap(this.value)">
              </div>
            </div>
          </div>

          <!-- Quick Tools -->
          <div>
            <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:8px;">Layout Tools</label>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <button type="button" class="ldoc-action-btn" onclick="window.LDocLivingTypography.triggerAutoFit()">🎯 Auto-Fit Text to Container</button>
              <button type="button" class="ldoc-action-btn" onclick="window.LDocLivingTypography.triggerTightFit()">🗜️ Tight Fit (Shrink-Wrap)</button>
              <button type="button" class="ldoc-action-btn" onclick="window.LDocLivingTypography.addPullQuotePrompt()">💬 + Insert Pull Quote</button>
              <button type="button" class="ldoc-action-btn" onclick="window.LDocLivingTypography.toggleFlowGuides()">📐 Toggle Flow Guides</button>
            </div>
          </div>

          <!-- Advanced Toggles -->
          <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:14px;">
            <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:8px;">Advanced Options</label>
            <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;color:#cbd5e1;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" id="lt-cb-obstacles" checked onchange="window.LDocLivingTypography.toggleWrapObstacles(this.checked)">
                <span>Wrap Text Around Objects</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" id="lt-cb-balance" checked onchange="window.LDocLivingTypography.toggleAutoBalance(this.checked)">
                <span>Auto Balance Columns</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" id="lt-cb-lock" onchange="window.LDocLivingTypography.toggleFlowLock(this.checked)">
                <span>Lock Geometry (Keep Layout Fixed)</span>
              </label>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button type="button" class="ldoc-btn-secondary" style="flex:1;" onclick="window.LDocLivingTypography.resetFlow()">Reset</button>
            <button type="button" class="ldoc-btn-primary" style="flex:2;" onclick="window.LDocLivingTypography.applyAndClose()">Apply Flow</button>
          </div>

        </div>
      `;

      document.body.appendChild(drawer);
    },

    _injectObstacleInspectorUI: function () {
      if (typeof document === 'undefined') return;
      if (document.getElementById('ldoc-obstacle-inspector')) return;

      const inspector = document.createElement('div');
      inspector.id = 'ldoc-obstacle-inspector';
      inspector.className = 'ldoc-obstacle-hud';
      inspector.style.display = 'none';

      inspector.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:11px;font-weight:800;color:#38bdf8;letter-spacing:0.5px;">TEXT FLOW OBSTACLE</div>
          <button type="button" onclick="this.parentElement.parentElement.style.display='none'" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;">✕</button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:11.5px;color:#e2e8f0;">
          <label style="display:flex;align-items:center;justify-content:space-between;">
            <span>Flow Margin:</span>
            <input type="number" id="obs-margin-input" min="0" max="64" value="16" style="width:50px;background:#1e293b;border:1px solid #475569;color:#fff;border-radius:4px;padding:2px 4px;" oninput="window.LDocLivingTypography.updateActiveObstacleMargin(this.value)">
          </label>
          <div style="display:flex;gap:4px;">
            <button type="button" class="ldoc-obs-btn" onclick="window.LDocLivingTypography.animateActiveObstacle()">⚡ Animate Flow</button>
            <button type="button" class="ldoc-obs-btn" onclick="window.LDocLivingTypography.removeActiveObstacle()">Remove</button>
          </div>
        </div>
      `;

      document.body.appendChild(inspector);
    },

    _injectFlowGuidesOverlay: function () {
      if (typeof document === 'undefined') return;
      if (document.getElementById('ldoc-flow-guides-overlay')) return;

      const overlay = document.createElement('div');
      overlay.id = 'ldoc-flow-guides-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:var(--z-selection-overlay, 100);display:none;';
      document.body.appendChild(overlay);
    },

    _injectDiagnosticsHUD: function () {
      if (typeof document === 'undefined') return;
      if (document.getElementById('ldoc-living-type-hud')) return;

      const hud = document.createElement('div');
      hud.id = 'ldoc-living-type-hud';
      hud.style.cssText = 'position:fixed;bottom:14px;right:14px;background:rgba(15,23,42,0.94);border:1px solid rgba(56,189,248,0.3);border-radius:8px;padding:8px 12px;font-family:monospace;font-size:10.5px;color:#94a3b8;z-index:var(--z-toast-notification, 1200);display:none;pointer-events:auto;box-shadow:0 8px 24px rgba(0,0,0,0.5);';
      hud.innerHTML = `
        <div style="color:#38bdf8;font-weight:700;margin-bottom:4px;display:flex;justify-content:space-between;">
          <span>✦ Pretext Diagnostics</span>
          <span style="cursor:pointer;" onclick="this.parentElement.parentElement.style.display='none'">✕</span>
        </div>
        <div id="lt-diag-content">Layout: 0.12ms | Lines: 0 | Obstacles: 0</div>
      `;
      document.body.appendChild(hud);
    },

    _updateDiagnosticsHUD: function () {
      const el = document.getElementById('lt-diag-content');
      if (!el) return;
      const d = this.state.diagnostics;
      el.textContent = `Layout: ${d.lastLayoutTime}ms | Lines: ${d.linesCount} | Width: ${d.usedWidth}px | Obstacles: ${d.activeObstacles}`;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 14. PUBLIC API METHODS FOR CONTROLS & COMMANDS
    // ─────────────────────────────────────────────────────────────────────────
    toggleDrawer: function (forceOpen) {
      const drawer = document.getElementById('ldoc-living-typography-drawer');
      const backdrop = document.getElementById('drawer-backdrop') || document.getElementById('pages-overlay');
      if (!drawer) return;

      const isOpen = (forceOpen !== undefined) ? forceOpen : !drawer.classList.contains('open');
      if (isOpen) {
        drawer.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
      } else {
        drawer.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
      }
    },

    applyPreset: function (presetKey) {
      const preset = this.presets[presetKey];
      if (!preset) return;

      this.state.currentMode = preset.mode;
      this.state.columns = preset.columns || 1;
      this.state.columnGap = preset.columnGap || 24;
      this.state.lineHeight = preset.lineHeight || 26;
      if (preset.wrapAroundObjects !== undefined) {
        this.state.wrapAroundObjects = preset.wrapAroundObjects;
      }

      // Sync inputs
      const colSlider = document.getElementById('lt-cols-slider');
      if (colSlider) colSlider.value = this.state.columns;
      const colDisp = document.getElementById('lt-cols-display');
      if (colDisp) colDisp.textContent = `${this.state.columns} Cols`;

      const lhSlider = document.getElementById('lt-lh-slider');
      if (lhSlider) lhSlider.value = this.state.lineHeight;
      const lhDisp = document.getElementById('lt-lh-display');
      if (lhDisp) lhDisp.textContent = `${this.state.lineHeight}px`;

      this.triggerLiveReflow();
      this._recordHistorySnapshot();

      if (global.LDocToast) {
        global.LDocToast.show(`✦ Preset Applied: ${preset.name}`, 'ok', 2000);
      }
    },

    setMode: function (mode) {
      this.state.currentMode = mode;
      this.triggerLiveReflow();
    },

    setColumns: function (count) {
      this.state.columns = parseInt(count, 10) || 1;
      const d = document.getElementById('lt-cols-display');
      if (d) d.textContent = `${this.state.columns} Cols`;
      this.triggerLiveReflow();
    },

    setLineHeight: function (val) {
      this.state.lineHeight = parseInt(val, 10) || 26;
      const d = document.getElementById('lt-lh-display');
      if (d) d.textContent = `${this.state.lineHeight}px`;
      this.triggerLiveReflow();
    },

    setColumnGap: function (val) {
      this.state.columnGap = parseInt(val, 10) || 32;
      const d = document.getElementById('lt-gap-display');
      if (d) d.textContent = `${this.state.columnGap}px`;
      this.triggerLiveReflow();
    },

    toggleWrapObstacles: function (val) {
      this.state.wrapAroundObjects = val;
      this.triggerLiveReflow();
    },

    toggleAutoBalance: function (val) {
      this.state.autoBalanceColumns = val;
      this.triggerLiveReflow();
    },

    toggleFlowLock: function (val) {
      this.state.flowLocked = val;
      if (global.LDocToast) {
        global.LDocToast.show(val ? '🔒 Flow Geometry Locked' : '🔓 Flow Geometry Unlocked', 'info', 1500);
      }
    },

    triggerAutoFit: function () {
      const activeEl = document.querySelector('[data-living-type="true"], .ldoc-living-text');
      if (!activeEl) return;
      const text = activeEl.getAttribute('data-raw-text') || activeEl.innerText;
      const parent = activeEl.parentElement || activeEl;
      const res = this.autoFitText(text, 'Plus Jakarta Sans', parent.offsetWidth || 400, parent.offsetHeight || 300);
      if (res) {
        activeEl.style.fontSize = `${res.fontSize}px`;
        activeEl.style.lineHeight = `${res.lineHeight}px`;
        this.triggerLiveReflow();
        if (global.LDocToast) {
          global.LDocToast.show(`🎯 Auto-Fit: ${res.fontSize}px (${res.lineCount} lines in ${res.fitTime}ms)`, 'ok', 2000);
        }
      }
    },

    triggerTightFit: function () {
      const activeEl = document.querySelector('[data-living-type="true"], .ldoc-living-text');
      if (!activeEl) return;
      const text = activeEl.getAttribute('data-raw-text') || activeEl.innerText;
      const font = window.getComputedStyle(activeEl).font || '16px "Plus Jakarta Sans", sans-serif';
      const res = this.calculateTightFitWidth(text, font, 3, 100, 800, this.state.lineHeight);
      if (res) {
        activeEl.style.width = `${res.calculatedWidth}px`;
        activeEl.style.maxWidth = `${res.calculatedWidth}px`;
        this.triggerLiveReflow();
        if (global.LDocToast) {
          global.LDocToast.show(`🗜️ Tight Fit: Narrowest width is ${res.calculatedWidth}px (${res.elapsedTime}ms)`, 'ok', 2500);
        }
      }
    },

    addPullQuotePrompt: function () {
      const quote = prompt('Enter Pull Quote text:', 'Typography is the geometry of living thoughts.');
      if (!quote) return;
      const author = prompt('Enter Author attribution:', '— LDOCX Creative Collective') || '';

      const container = document.getElementById('creator-canvas') || document.getElementById('main') || document.body;
      const pqEl = document.createElement('div');
      pqEl.className = 'ldoc-pull-quote-card ldoc-flow-obstacle';
      pqEl.style.cssText = 'position:absolute;left:240px;top:180px;width:260px;padding:16px 20px;background:rgba(15,23,42,0.85);backdrop-filter:blur(8px);border-left:3px solid #38bdf8;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.4);cursor:move;z-index:var(--z-interactive-widgets, 30);';
      pqEl.innerHTML = `
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:16px;font-style:italic;color:#f8fafc;line-height:1.4;">“${quote}”</div>
        <div style="font-size:11px;font-weight:700;color:#38bdf8;margin-top:8px;text-align:right;">${author}</div>
      `;

      container.appendChild(pqEl);
      const obsId = `pull_quote_${Date.now()}`;
      this.registerObstacle(obsId, pqEl, { margin: 24, shape: 'rectangle' });

      if (global.LDocToast) {
        global.LDocToast.show('💬 Pull Quote added as flow obstacle! Drag to reflow text.', 'ok', 2500);
      }
    },

    resetFlow: function () {
      this.applyPreset('basic');
    },

    applyAndClose: function () {
      this.triggerLiveReflow();
      this.toggleDrawer(false);
      this._recordHistorySnapshot();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 15. PRIVATE EVENT BINDINGS & HISTORY
    // ─────────────────────────────────────────────────────────────────────────
    _bindGlobalEvents: function () {
      // Hotkey: Ctrl+K / F1 for Command Palette actions
      window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          // Palette handles it
        }
      });
    },

    _showObstacleInspector: function (obsId) {
      const insp = document.getElementById('ldoc-obstacle-inspector');
      const obs = this.obstacles.get(obsId);
      if (!insp || !obs) return;

      this.state._selectedObstacleId = obsId;
      insp.style.display = 'block';
      insp.style.left = `${Math.min(window.innerWidth - 220, obs.rect.x + obs.rect.width + 12)}px`;
      insp.style.top = `${obs.rect.y}px`;

      const inp = document.getElementById('obs-margin-input');
      if (inp) inp.value = obs.margin || 16;
    },

    updateActiveObstacleMargin: function (val) {
      const id = this.state._selectedObstacleId;
      const obs = this.obstacles.get(id);
      if (obs) {
        obs.margin = parseInt(val, 10) || 16;
        this.triggerLiveReflow();
      }
    },

    animateActiveObstacle: function () {
      const id = this.state._selectedObstacleId;
      if (id) {
        this.startObstacleAnimation(id);
      }
    },

    removeActiveObstacle: function () {
      const id = this.state._selectedObstacleId;
      if (id) {
        const obs = this.obstacles.get(id);
        if (obs && obs.element) obs.element.remove();
        this.unregisterObstacle(id);
        const insp = document.getElementById('ldoc-obstacle-inspector');
        if (insp) insp.style.display = 'none';
      }
    },

    _recordHistorySnapshot: function () {
      if (global.LDocEditorCore && typeof global.LDocEditorCore.pushUndoSnapshot === 'function') {
        global.LDocEditorCore.pushUndoSnapshot();
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 16. EXPORT / GLOBAL MOUNT
  // ─────────────────────────────────────────────────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LDocLivingTypography;
  }
  if (typeof window !== 'undefined') {
    window.LDocLivingTypography = LDocLivingTypography;
    // Auto-init on DOMContentLoaded or immediate if already loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => LDocLivingTypography.init());
    } else {
      LDocLivingTypography.init();
    }
  }

})(typeof window !== 'undefined' ? window : globalThis);
