/**
 * LDOCX Studio Professional Creative Application Shell Controller
 * Orchestrates Top Bar, Tool Rail, Contextual Shelves, Canvas Stage,
 * Inspector Panel, Floating Mini-Toolbar, and Central Insert Experience.
 */

(function(window) {
  'use strict';

  const LDocStudioShell = {
    version: '2.0.0-pro',
    state: {
      selectedObject: null,
      selectedType: 'document', // 'document' | 'text' | 'shape' | 'media' | 'chart' | '3d' | 'simulation'
      activeTool: 'select',
      activeShelf: null,
      theme: 'dark',
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      saveStatus: 'saved',
      rulersVisible: true,
      gridVisible: true,
      snapEnabled: true,
      docTitle: 'Untitled Living Document'
    },

    // ── Initialization ──────────────────────────────────────────────────
    init() {
      console.log('[LDocStudioShell] Initializing Professional Creative Application Shell...');
      this.injectShellDOM();
      this.bindGlobalEvents();
      this.bindEngineListeners();
      this.applyTheme(this.state.theme);
      this.updateInspector();
      this.updateStatusStats();
      console.log('[LDocStudioShell] Application Shell Ready.');
    },

    // ── Inject Modern Shell DOM ─────────────────────────────────────────
    injectShellDOM() {
      if (document.getElementById('ldoc-studio-shell')) return;

      const shell = document.createElement('div');
      shell.id = 'ldoc-studio-shell';

      shell.innerHTML = `
        <!-- TOP APPLICATION BAR -->
        <header id="ldoc-top-bar" role="banner">
          <div class="ldoc-top-bar-left">
            <div class="ldoc-brand-cluster" title="LDOCX Studio Professional Creative Suite">
              <div class="ldoc-brand-logo">✦</div>
              <span class="ldoc-brand-title">LDOCX STUDIO</span>
            </div>

            <div class="ldoc-doc-title-wrapper" title="Click to rename document">
              <input type="text" id="ldoc-doc-title-input" class="ldoc-doc-title-input" value="${this.state.docTitle}" spellcheck="false" />
              <span style="font-size: 11px; opacity: 0.6;">✎</span>
            </div>

            <div id="ldoc-save-status" class="ldoc-save-badge" title="Storage State">
              <span class="ldoc-save-dot"></span>
              <span id="ldoc-save-text">Saved locally</span>
            </div>

            <!-- APPLICATION MENUBAR -->
            <nav class="ldoc-menubar" role="menubar">
              <div class="ldoc-menu-item" data-menu="file">
                <button class="ldoc-menu-trigger">File</button>
                <div class="ldoc-menu-dropdown" id="ldoc-menu-dropdown-file">
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('new-doc')"><span>New Document</span><span class="hotkey">Ctrl+N</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('open-doc')"><span>Open .ldocx...</span><span class="hotkey">Ctrl+O</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('save-doc')"><span>Save Document</span><span class="hotkey">Ctrl+S</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('export-unified')"><span>Export...</span><span class="hotkey">Ctrl+E</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('version-history')"><span>Version History</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('close-app')"><span>Exit</span></div>
                </div>
              </div>

              <div class="ldoc-menu-item" data-menu="edit">
                <button class="ldoc-menu-trigger">Edit</button>
                <div class="ldoc-menu-dropdown" id="ldoc-menu-dropdown-edit">
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('undo')"><span>Undo</span><span class="hotkey">Ctrl+Z</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('redo')"><span>Redo</span><span class="hotkey">Ctrl+Y</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('duplicate')"><span>Duplicate</span><span class="hotkey">Ctrl+D</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('delete')"><span>Delete</span><span class="hotkey">Del</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('select-all')"><span>Select All</span><span class="hotkey">Ctrl+A</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('command-palette')"><span>Command Palette</span><span class="hotkey">Ctrl+K</span></div>
                </div>
              </div>

              <div class="ldoc-menu-item" data-menu="view">
                <button class="ldoc-menu-trigger">View</button>
                <div class="ldoc-menu-dropdown" id="ldoc-menu-dropdown-view">
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('zoom-in')"><span>Zoom In</span><span class="hotkey">Ctrl++</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('zoom-out')"><span>Zoom Out</span><span class="hotkey">Ctrl+-</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('zoom-fit')"><span>Fit to Screen</span><span class="hotkey">Ctrl+0</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('toggle-rulers')"><span>Rulers</span><span class="hotkey">Ctrl+R</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('toggle-grid')"><span>Pixel Grid</span><span class="hotkey">Ctrl+'</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('toggle-snap')"><span>Snap-to-Grid</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('toggle-flow-guides')"><span>Living Flow Guides</span><span class="hotkey">Alt+F</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('presentation-mode')"><span>Presentation Mode</span><span class="hotkey">Ctrl+F5</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('toggle-theme')"><span>Toggle Light/Dark Theme</span></div>
                </div>
              </div>

              <div class="ldoc-menu-item" data-menu="insert">
                <button class="ldoc-menu-trigger" onclick="LDocStudioShell.openInsertModal()">Insert</button>
              </div>

              <div class="ldoc-menu-item" data-menu="layout">
                <button class="ldoc-menu-trigger">Layout</button>
                <div class="ldoc-menu-dropdown" id="ldoc-menu-dropdown-layout">
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('align-left')"><span>Align Left</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('align-center')"><span>Align Center</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('align-right')"><span>Align Right</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('align-top')"><span>Align Top</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('align-middle')"><span>Align Middle</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('align-bottom')"><span>Align Bottom</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('distribute-h')"><span>Distribute Horizontally</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('distribute-v')"><span>Distribute Vertically</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('group')"><span>Group</span><span class="hotkey">Ctrl+G</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('ungroup')"><span>Ungroup</span><span class="hotkey">Ctrl+Shift+G</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('z-front')"><span>Bring to Front</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('z-back')"><span>Send to Back</span></div>
                </div>
              </div>

              <div class="ldoc-menu-item" data-menu="data">
                <button class="ldoc-menu-trigger">Data & AI</button>
                <div class="ldoc-menu-dropdown" id="ldoc-menu-dropdown-data">
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.openShelf('data')"><span>Chart Pro Suite</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('open-reactive')"><span>Reactive Variables DAG</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('open-formula')"><span>Formula & Simulation Engine</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.openShelf('ai')"><span>AI Copilot Studio</span><span class="hotkey">Ctrl+Shift+H</span></div>
                </div>
              </div>

              <div class="ldoc-menu-item" data-menu="help">
                <button class="ldoc-menu-trigger">Help</button>
                <div class="ldoc-menu-dropdown" id="ldoc-menu-dropdown-help">
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('help-shortcuts')"><span>Keyboard Shortcuts</span><span class="hotkey">F1</span></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.dispatchAction('help-docs')"><span>Living Architecture Specs</span></div>
                  <div class="ldoc-menu-divider"></div>
                  <div class="ldoc-menu-entry" onclick="LDocStudioShell.openProModal()"><span>License & Pro Activation</span></div>
                </div>
              </div>
            </nav>
          </div>

          <div class="ldoc-top-bar-right">
            <button class="ldoc-btn-icon" id="ldoc-btn-undo" title="Undo (Ctrl+Z)" onclick="LDocStudioShell.dispatchAction('undo')">↩</button>
            <button class="ldoc-btn-icon" id="ldoc-btn-redo" title="Redo (Ctrl+Y)" onclick="LDocStudioShell.dispatchAction('redo')">↪</button>
            
            <button class="ldoc-btn-living-type" id="ldoc-btn-living-type" title="Living Typography Engine (Pretext)" onclick="LDocStudioShell.toggleLivingTypeDrawer()">
              <span>✦</span><span>Living Type</span>
            </button>

            <button class="ldoc-btn-present" id="ldoc-btn-present" title="Presentation Mode (Ctrl+F5)" onclick="LDocStudioShell.dispatchAction('presentation-mode')">
              <span>▶</span><span>Present</span>
            </button>

            <button class="ldoc-btn-export" id="ldoc-btn-export" title="Export Document (Ctrl+E)" onclick="LDocStudioShell.dispatchAction('export-unified')">
              <span>⬇</span><span>Export</span>
            </button>

            <button class="ldoc-btn-share" id="ldoc-btn-share" title="Share & Collaborate" onclick="LDocStudioShell.dispatchAction('share')">
              <span>🔗</span><span>Share</span>
            </button>

            <button class="ldoc-btn-icon" id="ldoc-btn-theme" title="Toggle Theme" onclick="LDocStudioShell.dispatchAction('toggle-theme')">🌓</button>

            <div class="ldoc-pro-badge" id="ldoc-pro-badge" onclick="LDocStudioShell.openProModal()" title="LDOCX Pro License Activated">
              <span>👑</span><span>PRO</span>
            </div>
          </div>
        </header>

        <!-- MIDDLE WORKSPACE ROW -->
        <div id="ldoc-workspace-row">
          <!-- LEFT TOOL RAIL -->
          <aside id="ldoc-tool-rail" role="toolbar" aria-label="Creative Tool Rail">
            <button class="ldoc-rail-btn add-btn" id="ldoc-rail-add" title="Add Blocks (+ Add)" onclick="LDocStudioShell.openInsertModal()">
              <span>+</span>
              <span class="rail-label">Add</span>
            </button>

            <button class="ldoc-rail-btn active" data-tool="select" title="Select (V)" onclick="LDocStudioShell.selectTool('select')">
              <span>✦</span>
              <span class="rail-label">Select</span>
            </button>

            <button class="ldoc-rail-btn" data-tool="text" title="Text (T)" onclick="LDocStudioShell.selectTool('text')">
              <span>T</span>
              <span class="rail-label">Text</span>
            </button>

            <button class="ldoc-rail-btn" data-tool="shapes" title="Shapes (R)" onclick="LDocStudioShell.selectTool('shapes')">
              <span>▣</span>
              <span class="rail-label">Shapes</span>
            </button>

            <button class="ldoc-rail-btn" data-tool="media" title="Media & Photos (M)" onclick="LDocStudioShell.selectTool('media')">
              <span>▧</span>
              <span class="rail-label">Media</span>
            </button>

            <div class="ldoc-rail-divider"></div>

            <button class="ldoc-rail-btn" data-tool="data" title="Charts & Data (D)" onclick="LDocStudioShell.selectTool('data')">
              <span>📊</span>
              <span class="rail-label">Charts</span>
            </button>

            <button class="ldoc-rail-btn" data-tool="reactive" title="Reactive Variables (X)" onclick="LDocStudioShell.selectTool('reactive')">
              <span>⚡</span>
              <span class="rail-label">Reactive</span>
            </button>

            <button class="ldoc-rail-btn" data-tool="3d" title="3D Inspector (3)" onclick="LDocStudioShell.selectTool('3d')">
              <span>◈</span>
              <span class="rail-label">3D</span>
            </button>

            <button class="ldoc-rail-btn" data-tool="living-type" title="Living Typography (Alt+T)" onclick="LDocStudioShell.selectTool('living-type')">
              <span>A</span>
              <span class="rail-label">Flow</span>
            </button>

            <div class="ldoc-rail-divider"></div>

            <button class="ldoc-rail-btn" data-tool="templates" title="Templates" onclick="LDocStudioShell.selectTool('templates')">
              <span>📑</span>
              <span class="rail-label">Layouts</span>
            </button>

            <button class="ldoc-rail-btn" data-tool="ai" title="AI Copilot (Ctrl+Shift+H)" onclick="LDocStudioShell.selectTool('ai')">
              <span>🤖</span>
              <span class="rail-label">AI</span>
            </button>
          </aside>

          <!-- CONTEXTUAL FLYOUT SHELF -->
          <aside id="ldoc-context-shelf" class="collapsed" role="region" aria-label="Tool Shelf">
            <div class="ldoc-shelf-header">
              <span class="ldoc-shelf-title" id="ldoc-shelf-title">Tool Shelf</span>
              <button class="ldoc-shelf-close" onclick="LDocStudioShell.closeShelf()">✕</button>
            </div>
            <div class="ldoc-shelf-body" id="ldoc-shelf-body">
              <!-- Dynamically populated by active shelf -->
            </div>
          </aside>

          <!-- CENTRAL LIVING CANVAS WORKSPACE -->
          <main id="ldoc-canvas-workspace" role="main">
            <div id="ldoc-ruler-corner"></div>
            <div id="ldoc-ruler-h"></div>
            <div id="ldoc-ruler-v"></div>

            <div id="ldoc-canvas-viewport">
              <!-- Existing canvas stages or elements mount here -->
              <div id="ldoc-canvas-mount-point"></div>
            </div>

            <!-- FLOATING CONTEXTUAL MINI-TOOLBAR -->
            <div id="ldoc-floating-toolbar" role="toolbar" aria-label="Quick Actions">
              <div id="ldoc-ftb-content">
                <!-- Dynamically rendered based on active selection -->
              </div>
            </div>
          </main>

          <!-- RIGHT INSPECTOR PANEL -->
          <aside id="ldoc-inspector-panel" role="complementary" aria-label="Property Inspector">
            <div class="ldoc-inspector-header">
              <div class="ldoc-inspector-title-cluster">
                <span class="ldoc-inspector-icon" id="ldoc-inspector-icon">⚙</span>
                <span class="ldoc-inspector-title" id="ldoc-inspector-title">Document</span>
              </div>
              <span class="ldoc-inspector-type-pill" id="ldoc-inspector-type">CANVAS</span>
            </div>
            <div class="ldoc-inspector-scroll" id="ldoc-inspector-body">
              <!-- Dynamically populated based on selection -->
            </div>
          </aside>
        </div>

        <!-- BOTTOM STATUS & VIEWPORT HUD -->
        <footer id="ldoc-status-bar" role="contentinfo">
          <div class="ldoc-status-left">
            <button class="ldoc-status-btn" id="ldoc-btn-pages-toggle" onclick="LDocStudioShell.dispatchAction('toggle-pages')">
              <span>📑</span><span id="ldoc-status-page-count">Pages (1/1)</span><span>▾</span>
            </button>
            <button class="ldoc-status-btn" title="Add New Page" onclick="LDocStudioShell.dispatchAction('add-page')">
              <span>+ Page</span>
            </button>
          </div>

          <div class="ldoc-status-center">
            <span id="ldoc-status-stats">1 Page • 0 Blocks • Live</span>
            <span id="ldoc-status-coords" style="font-family: var(--ldoc-font-mono); opacity: 0.7;">X: 0, Y: 0</span>
          </div>

          <div class="ldoc-status-right">
            <div class="ldoc-zoom-control">
              <button class="ldoc-status-btn" onclick="LDocStudioShell.dispatchAction('zoom-out')" title="Zoom Out">−</button>
              <span id="ldoc-zoom-display" style="min-width: 42px; text-align: center; font-weight: 600;">100%</span>
              <button class="ldoc-status-btn" onclick="LDocStudioShell.dispatchAction('zoom-in')" title="Zoom In">+</button>
            </div>
            <button class="ldoc-status-btn" id="ldoc-status-btn-fit" onclick="LDocStudioShell.dispatchAction('zoom-fit')">Fit</button>
            <button class="ldoc-status-btn" id="ldoc-status-btn-grid" onclick="LDocStudioShell.dispatchAction('toggle-grid')" title="Toggle Pixel Grid">▦ Grid</button>
            <button class="ldoc-status-btn" id="ldoc-status-btn-rulers" onclick="LDocStudioShell.dispatchAction('toggle-rulers')" title="Toggle Rulers">📏 Rulers</button>
            <button class="ldoc-status-btn" id="ldoc-status-btn-snap" onclick="LDocStudioShell.dispatchAction('toggle-snap')" title="Toggle Snap">🧲 Snap</button>
            <button class="ldoc-status-btn" onclick="LDocStudioShell.dispatchAction('toggle-fullscreen')" title="Fullscreen (F11)">⛶</button>
          </div>
        </footer>

        <!-- UNIFIED INSERT MODAL (+ Add) -->
        <div id="ldoc-insert-modal" role="dialog" aria-modal="true" aria-labelledby="ldoc-insert-modal-title">
          <div class="ldoc-insert-box">
            <div class="ldoc-insert-header">
              <div class="ldoc-insert-title" id="ldoc-insert-modal-title">
                <span>✦</span><span>Add to Living Document</span>
              </div>
              <input type="text" class="ldoc-insert-search-input" id="ldoc-insert-search" placeholder="Search blocks, shapes, charts..." />
              <button class="ldoc-shelf-close" onclick="LDocStudioShell.closeInsertModal()">✕</button>
            </div>
            <div class="ldoc-insert-body" id="ldoc-insert-grid">
              <!-- Categorized Cards -->
              <div>
                <div class="ldoc-insert-section-title">Text & Typography</div>
                <div class="ldoc-insert-card-grid">
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('text-heading')">
                    <span class="ldoc-insert-card-icon">H1</span>
                    <span class="ldoc-insert-card-name">Headline</span>
                    <span class="ldoc-insert-card-sub">Bold display title</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('text-body')">
                    <span class="ldoc-insert-card-icon">¶</span>
                    <span class="ldoc-insert-card-name">Paragraph</span>
                    <span class="ldoc-insert-card-sub">Standard body text</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('text-living')">
                    <span class="ldoc-insert-card-icon" style="color: #a855f7;">✦</span>
                    <span class="ldoc-insert-card-name">Living Flow</span>
                    <span class="ldoc-insert-card-sub">Obstacle-avoiding flow</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('text-quote')">
                    <span class="ldoc-insert-card-icon">❝</span>
                    <span class="ldoc-insert-card-name">Pull Quote</span>
                    <span class="ldoc-insert-card-sub">Editorial highlight</span>
                  </div>
                </div>
              </div>

              <div>
                <div class="ldoc-insert-section-title">Shapes & Vectors</div>
                <div class="ldoc-insert-card-grid">
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('shape-rect')">
                    <span class="ldoc-insert-card-icon">▭</span>
                    <span class="ldoc-insert-card-name">Rectangle</span>
                    <span class="ldoc-insert-card-sub">Rounded box</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('shape-circle')">
                    <span class="ldoc-insert-card-icon">◯</span>
                    <span class="ldoc-insert-card-name">Circle</span>
                    <span class="ldoc-insert-card-sub">Perfect circle</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('shape-star')">
                    <span class="ldoc-insert-card-icon">★</span>
                    <span class="ldoc-insert-card-name">Star</span>
                    <span class="ldoc-insert-card-sub">Vector star badge</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('shape-arrow')">
                    <span class="ldoc-insert-card-icon">➔</span>
                    <span class="ldoc-insert-card-name">Arrow</span>
                    <span class="ldoc-insert-card-sub">Directional callout</span>
                  </div>
                </div>
              </div>

              <div>
                <div class="ldoc-insert-section-title">Data & Charts</div>
                <div class="ldoc-insert-card-grid">
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('chart-bar')">
                    <span class="ldoc-insert-card-icon">📊</span>
                    <span class="ldoc-insert-card-name">Bar Chart</span>
                    <span class="ldoc-insert-card-sub">Interactive bars</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('chart-line')">
                    <span class="ldoc-insert-card-icon">📈</span>
                    <span class="ldoc-insert-card-name">Line Chart</span>
                    <span class="ldoc-insert-card-sub">Time-series data</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('chart-pie')">
                    <span class="ldoc-insert-card-icon">🥧</span>
                    <span class="ldoc-insert-card-name">Pie / Donut</span>
                    <span class="ldoc-insert-card-sub">Proportions</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('chart-radar')">
                    <span class="ldoc-insert-card-icon">🕸️</span>
                    <span class="ldoc-insert-card-name">Radar Chart</span>
                    <span class="ldoc-insert-card-sub">Multivariate stats</span>
                  </div>
                </div>
              </div>

              <div>
                <div class="ldoc-insert-section-title">Living Media & 3D</div>
                <div class="ldoc-insert-card-grid">
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('media-image')">
                    <span class="ldoc-insert-card-icon">🖼️</span>
                    <span class="ldoc-insert-card-name">Image Obstacle</span>
                    <span class="ldoc-insert-card-sub">Flows text around</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('media-3d')">
                    <span class="ldoc-insert-card-icon">◈</span>
                    <span class="ldoc-insert-card-name">3D Model</span>
                    <span class="ldoc-insert-card-sub">Interactive viewport</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('data-reactive')">
                    <span class="ldoc-insert-card-icon" style="color: #38bdf8;">⚡</span>
                    <span class="ldoc-insert-card-name">Reactive Var</span>
                    <span class="ldoc-insert-card-sub">Dynamic slider bind</span>
                  </div>
                  <div class="ldoc-insert-card" onclick="LDocStudioShell.insertBlock('data-sim')">
                    <span class="ldoc-insert-card-icon">∑</span>
                    <span class="ldoc-insert-card-name">Formula Sim</span>
                    <span class="ldoc-insert-card-sub">Live computation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- PRO LICENSE MODAL -->
        <div id="ldoc-pro-modal" role="dialog" aria-modal="true">
          <div class="ldoc-pro-box">
            <div class="ldoc-pro-header">
              <div class="ldoc-pro-title">
                <span>👑</span><span>LDOCX Studio Pro</span>
              </div>
              <button class="ldoc-shelf-close" onclick="LDocStudioShell.closeProModal()">✕</button>
            </div>
            <p style="font-size: 13px; color: var(--ldoc-text-secondary); margin: 0; line-height: 1.5;">
              Unlock full commercial exports (DOCX, PPTX, standalone HTML, vector PDF), unlimited Living Typography layouts, 3D exploded inspection, and high-frequency reactive recalculation.
            </p>
            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--ldoc-radius-md); padding: 12px;">
              <div style="font-weight: 700; font-size: 12px; color: var(--ldoc-accent-gold); margin-bottom: 4px;">Official Lifetime License</div>
              <div style="font-size: 11px; color: var(--ldoc-text-secondary);">Direct digital fulfillment via LemonSqueezy. One-time purchase, perpetual desktop access.</div>
            </div>
            <a href="https://jay-app.lemonsqueezy.com/checkout/buy/16851c1c-6dfb-4607-bf8b-81c3427594d1" target="_blank" rel="noopener noreferrer" class="ldoc-pro-btn-buy" id="ldoc-pro-buy-link">
              <span>👑</span><span>Get Pro License on LemonSqueezy</span>
            </a>
            <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
              <input type="text" class="ldoc-input" id="ldoc-license-key-input" placeholder="Enter license key (LDOC-PRO-...)" style="flex: 1;" />
              <button class="ldoc-btn-export" onclick="LDocStudioShell.activateLicense()">Activate</button>
            </div>
          </div>
        </div>
      `;

      // Mount into body
      document.body.prepend(shell);

      // Reposition or link existing editor canvas stage into #ldoc-canvas-mount-point
      this.reparentExistingCanvas();
    },

    // ── Reparent Existing Canvas & Stages ─────────────────────────────────
    reparentExistingCanvas() {
      const mountPoint = document.getElementById('ldoc-canvas-mount-point');
      if (!mountPoint) return;

      // Check for #viewport or existing canvas containers
      const existingViewport = document.getElementById('viewport') || document.getElementById('canvas-container') || document.querySelector('.canvas-stage');
      if (existingViewport && !mountPoint.contains(existingViewport)) {
        mountPoint.appendChild(existingViewport);
      }

      // Hide the legacy cluttered horizontal #toolbar if present
      const legacyToolbar = document.getElementById('toolbar');
      if (legacyToolbar) {
        legacyToolbar.style.display = 'none';
      }
    },

    // ── Global Event Binding ─────────────────────────────────────────────
    bindGlobalEvents() {
      // Document title inline editing
      const titleInput = document.getElementById('ldoc-doc-title-input');
      if (titleInput) {
        titleInput.addEventListener('input', (e) => {
          this.state.docTitle = e.target.value;
          this.setSaveStatus('dirty');
          if (window.docAST) {
            window.docAST.title = e.target.value;
          }
        });
        titleInput.addEventListener('blur', () => {
          this.dispatchAction('save-doc');
        });
      }

      // Menubar dropdown toggles
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.ldoc-menu-trigger');
        const activeDropdown = document.querySelector('.ldoc-menu-dropdown.open');

        if (trigger) {
          e.stopPropagation();
          const item = trigger.closest('.ldoc-menu-item');
          const dropdown = item ? item.querySelector('.ldoc-menu-dropdown') : null;
          
          if (activeDropdown && activeDropdown !== dropdown) {
            activeDropdown.classList.remove('open');
          }
          if (dropdown) {
            dropdown.classList.toggle('open');
          }
        } else if (activeDropdown && !e.target.closest('.ldoc-menu-dropdown')) {
          activeDropdown.classList.remove('open');
        }
      });

      // Canvas click & selection listener
      document.addEventListener('click', (e) => {
        // If clicking inside shell chrome or modals, do nothing
        if (e.target.closest('#ldoc-top-bar, #ldoc-tool-rail, #ldoc-context-shelf, #ldoc-inspector-panel, #ldoc-floating-toolbar, #ldoc-status-bar, #ldoc-insert-modal, #ldoc-pro-modal')) {
          return;
        }

        const block = e.target.closest('.ed-block, [data-block-id], .ldoc-flow-obstacle, .canvas-object, .block-wrapper');
        if (block) {
          this.selectObject(block);
        } else {
          this.deselectAll();
        }
      });

      // Keyboard shortcuts
      window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
          e.preventDefault();
          this.dispatchAction('zoom-in');
        } else if (e.ctrlKey && e.key === '-') {
          e.preventDefault();
          this.dispatchAction('zoom-out');
        } else if (e.ctrlKey && e.key === '0') {
          e.preventDefault();
          this.dispatchAction('zoom-fit');
        } else if (e.ctrlKey && (e.key === 'f5' || e.keyCode === 116)) {
          e.preventDefault();
          this.dispatchAction('presentation-mode');
        } else if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) {
          e.preventDefault();
          this.dispatchAction('command-palette');
        } else if (e.key === 'Escape') {
          this.closeInsertModal();
          this.closeProModal();
          this.closeShelf();
        }
      });
    },

    // ── Bind Existing Engines ─────────────────────────────────────────────
    bindEngineListeners() {
      // Listen for AST updates
      window.addEventListener('ldoc:blockSelected', (e) => {
        if (e.detail && e.detail.block) {
          this.selectObject(e.detail.block);
        }
      });

      window.addEventListener('ldoc:contentChanged', () => {
        this.setSaveStatus('dirty');
        this.updateStatusStats();
      });
    },

    // ── Tool Rail Selection ───────────────────────────────────────────────
    selectTool(toolId) {
      this.state.activeTool = toolId;
      document.querySelectorAll('.ldoc-rail-btn').forEach(btn => {
        if (btn.dataset.tool === toolId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Map tool to contextual shelf
      const shelfMap = {
        'text': 'text',
        'shapes': 'shapes',
        'media': 'media',
        'data': 'data',
        'reactive': 'reactive',
        '3d': '3d',
        'living-type': 'living-type',
        'templates': 'templates',
        'ai': 'ai'
      };

      if (shelfMap[toolId]) {
        this.openShelf(shelfMap[toolId]);
      } else {
        this.closeShelf();
      }
    },

    // ── Contextual Shelf Logic ───────────────────────────────────────────
    openShelf(shelfId) {
      this.state.activeShelf = shelfId;
      const shelf = document.getElementById('ldoc-context-shelf');
      const title = document.getElementById('ldoc-shelf-title');
      const body = document.getElementById('ldoc-shelf-body');
      if (!shelf || !body) return;

      shelf.classList.remove('collapsed');

      if (shelfId === 'shapes') {
        title.textContent = 'Vector Shapes & Primitives';
        body.innerHTML = `
          <div class="ldoc-shelf-grid">
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('shape-rect')">
              <span class="ldoc-shelf-card-icon">▭</span>
              <span class="ldoc-shelf-card-label">Rectangle</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('shape-rounded')">
              <span class="ldoc-shelf-card-icon">▢</span>
              <span class="ldoc-shelf-card-label">Rounded Rect</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('shape-circle')">
              <span class="ldoc-shelf-card-icon">◯</span>
              <span class="ldoc-shelf-card-label">Circle</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('shape-star')">
              <span class="ldoc-shelf-card-icon">★</span>
              <span class="ldoc-shelf-card-label">Star Badge</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('shape-arrow')">
              <span class="ldoc-shelf-card-icon">➔</span>
              <span class="ldoc-shelf-card-label">Right Arrow</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('shape-callout')">
              <span class="ldoc-shelf-card-icon">💬</span>
              <span class="ldoc-shelf-card-label">Speech Callout</span>
            </div>
          </div>
        `;
      } else if (shelfId === 'data') {
        title.textContent = 'Charts & Data Visualization';
        body.innerHTML = `
          <div class="ldoc-shelf-grid">
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('chart-bar')">
              <span class="ldoc-shelf-card-icon">📊</span>
              <span class="ldoc-shelf-card-label">Bar Chart</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('chart-line')">
              <span class="ldoc-shelf-card-icon">📈</span>
              <span class="ldoc-shelf-card-label">Line Chart</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('chart-pie')">
              <span class="ldoc-shelf-card-icon">🥧</span>
              <span class="ldoc-shelf-card-label">Pie Chart</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('chart-doughnut')">
              <span class="ldoc-shelf-card-icon">🍩</span>
              <span class="ldoc-shelf-card-label">Doughnut</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('chart-radar')">
              <span class="ldoc-shelf-card-icon">🕸️</span>
              <span class="ldoc-shelf-card-label">Radar Chart</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.insertBlock('chart-waterfall')">
              <span class="ldoc-shelf-card-icon">📉</span>
              <span class="ldoc-shelf-card-label">Waterfall</span>
            </div>
          </div>
        `;
      } else if (shelfId === 'living-type') {
        title.textContent = 'Living Typography Flow (Pretext)';
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: var(--ldoc-radius-md); padding: 12px;">
              <div style="font-weight: 700; font-size: 12px; color: #e9d5ff; margin-bottom: 4px;">✦ Pretext Flow Engine</div>
              <div style="font-size: 11px; color: var(--ldoc-text-secondary); line-height: 1.4;">
                Hot-path layout in &lt;0.04ms. Dynamically flows around image and 3D obstacles with balanced multi-column distribution.
              </div>
            </div>
            <button class="ldoc-btn-living-type" onclick="LDocStudioShell.dispatchAction('insert-editorial-spread')" style="width: 100%; justify-content: center;">
              <span>✦</span><span>Insert Editorial Spread</span>
            </button>
            <button class="ldoc-btn-export" onclick="LDocStudioShell.dispatchAction('toggle-flow-guides')" style="width: 100%; justify-content: center;">
              <span>📏</span><span>Toggle Flow Guides (Alt+F)</span>
            </button>
            <button class="ldoc-btn-export" onclick="LDocStudioShell.toggleLivingTypeDrawer()" style="width: 100%; justify-content: center;">
              <span>⚙</span><span>Open Living Typography Studio</span>
            </button>
          </div>
        `;
      } else if (shelfId === 'ai') {
        title.textContent = 'AI Creative Copilot';
        body.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <textarea class="ldoc-input" id="ldoc-ai-prompt" placeholder="Ask AI Copilot to write, design, summarize, or generate dynamic charts..." rows="4" style="resize: vertical; width: 100%; box-sizing: border-box;"></textarea>
            <button class="ldoc-btn-present" onclick="LDocStudioShell.dispatchAction('run-ai-copilot')" style="justify-content: center;">
              <span>🤖</span><span>Generate with Copilot</span>
            </button>
          </div>
        `;
      } else if (shelfId === 'templates') {
        title.textContent = 'Professional Layout Templates';
        body.innerHTML = `
          <div class="ldoc-shelf-grid">
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.dispatchAction('load-template-editorial')">
              <span class="ldoc-shelf-card-icon">📰</span>
              <span class="ldoc-shelf-card-label">Editorial Magazine</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.dispatchAction('load-template-deck')">
              <span class="ldoc-shelf-card-icon">📽️</span>
              <span class="ldoc-shelf-card-label">Pitch Deck (16:9)</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.dispatchAction('load-template-stem')">
              <span class="ldoc-shelf-card-icon">🔬</span>
              <span class="ldoc-shelf-card-label">STEM Research</span>
            </div>
            <div class="ldoc-shelf-card" onclick="LDocStudioShell.dispatchAction('load-template-executive')">
              <span class="ldoc-shelf-card-icon">💼</span>
              <span class="ldoc-shelf-card-label">Executive Brief</span>
            </div>
          </div>
        `;
      } else {
        title.textContent = 'Tool Shelf';
        body.innerHTML = `<div style="font-size: 12px; color: var(--ldoc-text-muted); text-align: center; padding: 20px 0;">Select a tool from the rail to view options.</div>`;
      }
    },

    closeShelf() {
      this.state.activeShelf = null;
      const shelf = document.getElementById('ldoc-context-shelf');
      if (shelf) shelf.classList.add('collapsed');
      if (this.state.activeTool !== 'select') {
        this.selectTool('select');
      }
    },

    // ── Selection State & Dynamic Inspector ───────────────────────────────
    selectObject(element) {
      if (!element) return;
      this.state.selectedObject = element;

      // Determine object type
      let type = 'shape';
      const tag = element.tagName ? element.tagName.toLowerCase() : '';
      const cls = element.className || '';

      if (tag === 'img' || cls.includes('image') || cls.includes('media') || element.querySelector('img')) {
        type = 'media';
      } else if (tag === 'p' || tag === 'h1' || tag === 'h2' || tag === 'h3' || cls.includes('text') || cls.includes('living-text')) {
        type = 'text';
      } else if (cls.includes('chart') || element.querySelector('canvas.chart-canvas') || element.dataset.chartType) {
        type = 'chart';
      } else if (cls.includes('3d') || cls.includes('three') || element.querySelector('canvas.three-canvas')) {
        type = '3d';
      } else if (cls.includes('simulation') || cls.includes('formula')) {
        type = 'simulation';
      }

      this.state.selectedType = type;
      this.updateInspector();
      this.updateFloatingToolbar(element);

      // Update coordinates
      const rect = element.getBoundingClientRect();
      const coords = document.getElementById('ldoc-status-coords');
      if (coords) {
        coords.textContent = `X: ${Math.round(rect.left)}, Y: ${Math.round(rect.top)} | W: ${Math.round(rect.width)}, H: ${Math.round(rect.height)}`;
      }
    },

    deselectAll() {
      this.state.selectedObject = null;
      this.state.selectedType = 'document';
      this.updateInspector();
      this.hideFloatingToolbar();

      const coords = document.getElementById('ldoc-status-coords');
      if (coords) {
        coords.textContent = 'X: 0, Y: 0';
      }
    },

    // ── Update Right Inspector Based on Context ──────────────────────────
    updateInspector() {
      const titleEl = document.getElementById('ldoc-inspector-title');
      const iconEl = document.getElementById('ldoc-inspector-icon');
      const typeEl = document.getElementById('ldoc-inspector-type');
      const bodyEl = document.getElementById('ldoc-inspector-body');
      if (!titleEl || !bodyEl) return;

      const type = this.state.selectedType;

      if (type === 'document') {
        titleEl.textContent = 'Document Setup';
        iconEl.textContent = '📄';
        typeEl.textContent = 'PAGE';
        bodyEl.innerHTML = `
          <div class="ldoc-accordion">
            <div class="ldoc-accordion-header"><span>Canvas Dimensions</span></div>
            <div class="ldoc-accordion-content">
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Format</span>
                <select class="ldoc-select" onchange="LDocStudioShell.setCanvasFormat(this.value)">
                  <option value="16:9">Presentation (16:9)</option>
                  <option value="a4">Document (A4)</option>
                  <option value="letter">US Letter</option>
                  <option value="square">Social Square (1:1)</option>
                </select>
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Orientation</span>
                <select class="ldoc-select">
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>
            </div>
          </div>

          <div class="ldoc-accordion">
            <div class="ldoc-accordion-header"><span>Visual Theme & Background</span></div>
            <div class="ldoc-accordion-content">
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Background Color</span>
                <input type="color" class="ldoc-color-picker" value="#090c15" onchange="LDocStudioShell.setCanvasBg(this.value)" />
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Grid Overlay</span>
                <input type="checkbox" checked onchange="LDocStudioShell.dispatchAction('toggle-grid')" />
              </div>
            </div>
          </div>
        `;
      } else if (type === 'text') {
        titleEl.textContent = 'Typography & Flow';
        iconEl.textContent = 'T';
        typeEl.textContent = 'TEXT';
        bodyEl.innerHTML = `
          <div class="ldoc-accordion">
            <div class="ldoc-accordion-header"><span>Font & Style</span></div>
            <div class="ldoc-accordion-content">
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Font Family</span>
                <select class="ldoc-select" onchange="LDocStudioShell.applyStyle('fontFamily', this.value)">
                  <option value="Inter">Inter</option>
                  <option value="Cinzel">Cinzel</option>
                  <option value="Merriweather">Merriweather</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                </select>
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Font Size</span>
                <div class="ldoc-field-input-group">
                  <input type="number" class="ldoc-input ldoc-input-sm" value="16" min="8" max="120" onchange="LDocStudioShell.applyStyle('fontSize', this.value + 'px')" />
                  <span style="font-size: 11px; opacity: 0.6;">px</span>
                </div>
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Color</span>
                <input type="color" class="ldoc-color-picker" value="#f8fafc" onchange="LDocStudioShell.applyStyle('color', this.value)" />
              </div>
            </div>
          </div>

          <div class="ldoc-accordion">
            <div class="ldoc-accordion-header"><span>Living Typography (Pretext)</span></div>
            <div class="ldoc-accordion-content">
              <div class="ldoc-living-badge-pill">
                <span>✦</span><span>Living Flow Active</span>
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Columns</span>
                <input type="range" class="ldoc-slider" min="1" max="4" value="2" oninput="LDocStudioShell.applyPretextColumns(this.value)" />
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Obstacle Wrap</span>
                <input type="checkbox" checked onchange="LDocStudioShell.toggleObstacleWrap(this.checked)" />
              </div>
            </div>
          </div>
        `;
      } else if (type === 'shape') {
        titleEl.textContent = 'Vector Geometry';
        iconEl.textContent = '▣';
        typeEl.textContent = 'SHAPE';
        bodyEl.innerHTML = `
          <div class="ldoc-accordion">
            <div class="ldoc-accordion-header"><span>Fill & Stroke</span></div>
            <div class="ldoc-accordion-content">
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Fill Color</span>
                <input type="color" class="ldoc-color-picker" value="#38bdf8" onchange="LDocStudioShell.applyStyle('backgroundColor', this.value)" />
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Border Radius</span>
                <input type="range" class="ldoc-slider" min="0" max="48" value="8" oninput="LDocStudioShell.applyStyle('borderRadius', this.value + 'px')" />
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Opacity</span>
                <input type="range" class="ldoc-slider" min="10" max="100" value="100" oninput="LDocStudioShell.applyStyle('opacity', this.value / 100)" />
              </div>
            </div>
          </div>
        `;
      } else if (type === 'media') {
        titleEl.textContent = 'Media & Obstacle';
        iconEl.textContent = '🖼️';
        typeEl.textContent = 'IMAGE';
        bodyEl.innerHTML = `
          <div class="ldoc-accordion">
            <div class="ldoc-accordion-header"><span>Pretext Flow Obstacle</span></div>
            <div class="ldoc-accordion-content">
              <div class="ldoc-living-badge-pill" style="background: rgba(56, 189, 248, 0.2); border-color: #38bdf8; color: #38bdf8;">
                <span>✦</span><span>Living Obstacle Registered</span>
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Clearance Margin</span>
                <div class="ldoc-field-input-group">
                  <input type="range" class="ldoc-slider" min="4" max="64" value="24" oninput="LDocStudioShell.applyObstacleMargin(this.value)" />
                  <span id="ldoc-margin-val" style="font-size: 11px; width: 32px;">24px</span>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (type === 'chart') {
        titleEl.textContent = 'Chart Pro Inspector';
        iconEl.textContent = '📊';
        typeEl.textContent = 'CHART';
        bodyEl.innerHTML = `
          <div class="ldoc-accordion">
            <div class="ldoc-accordion-header"><span>Chart Configuration</span></div>
            <div class="ldoc-accordion-content">
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Chart Type</span>
                <select class="ldoc-select" onchange="LDocStudioShell.applyChartType(this.value)">
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="radar">Radar Chart</option>
                </select>
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">⚡ Reactive Variable</span>
                <select class="ldoc-select">
                  <option value="sales">var sales_2026</option>
                  <option value="growth">var annual_growth</option>
                </select>
              </div>
            </div>
          </div>
        `;
      } else if (type === '3d') {
        titleEl.textContent = '3D Model Viewport';
        iconEl.textContent = '◈';
        typeEl.textContent = '3D MESH';
        bodyEl.innerHTML = `
          <div class="ldoc-accordion">
            <div class="ldoc-accordion-header"><span>Camera & Shading</span></div>
            <div class="ldoc-accordion-content">
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Lighting Preset</span>
                <select class="ldoc-select">
                  <option value="studio">Studio Light</option>
                  <option value="neon">Cyber Neon</option>
                  <option value="sunset">Sunset Gold</option>
                </select>
              </div>
              <div class="ldoc-field-row">
                <span class="ldoc-field-label">Exploded View</span>
                <input type="range" class="ldoc-slider" min="0" max="100" value="0" />
              </div>
            </div>
          </div>
        `;
      }
    },

    // ── Floating Contextual Mini-Toolbar ──────────────────────────────────
    updateFloatingToolbar(element) {
      const ftb = document.getElementById('ldoc-floating-toolbar');
      const content = document.getElementById('ldoc-ftb-content');
      if (!ftb || !content || !element) return;

      const type = this.state.selectedType;

      if (type === 'text') {
        content.innerHTML = `
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('font-bold')" title="Bold (Ctrl+B)"><b>B</b></button>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('font-italic')" title="Italic (Ctrl+I)"><i>I</i></button>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('font-underline')" title="Underline (Ctrl+U)"><u>U</u></button>
          <div class="ldoc-ftb-divider"></div>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('align-left')" title="Align Left">⇤</button>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('align-center')" title="Align Center">⇹</button>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('align-right')" title="Align Right">⇥</button>
          <div class="ldoc-ftb-divider"></div>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.toggleLivingTypeDrawer()" style="color: #a855f7;" title="Living Typography Flow">✦ Flow</button>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('delete')" title="Delete" style="color: #f43f5e;">🗑️</button>
        `;
      } else if (type === 'shape') {
        content.innerHTML = `
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('duplicate')" title="Duplicate (Ctrl+D)">⧉ Copy</button>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('z-front')" title="Bring to Front">⤊ Front</button>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('z-back')" title="Send to Back">⤋ Back</button>
          <div class="ldoc-ftb-divider"></div>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('delete')" title="Delete" style="color: #f43f5e;">🗑️</button>
        `;
      } else if (type === 'media') {
        content.innerHTML = `
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('toggle-obstacle')" style="color: #38bdf8;" title="Make Living Obstacle">✦ Flow Obstacle</button>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('crop')" title="Crop Image">✂ Crop</button>
          <div class="ldoc-ftb-divider"></div>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('delete')" title="Delete" style="color: #f43f5e;">🗑️</button>
        `;
      } else {
        content.innerHTML = `
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('duplicate')" title="Duplicate">⧉</button>
          <button class="ldoc-ftb-btn" onclick="LDocStudioShell.dispatchAction('delete')" title="Delete" style="color: #f43f5e;">🗑️</button>
        `;
      }

      // Position mini-toolbar above selected element
      const rect = element.getBoundingClientRect();
      const workspaceRect = document.getElementById('ldoc-canvas-workspace').getBoundingClientRect();

      let top = rect.top - workspaceRect.top - 42;
      let left = rect.left - workspaceRect.left + (rect.width / 2) - 100;

      if (top < 10) top = rect.bottom - workspaceRect.top + 10;
      if (left < 10) left = 10;

      ftb.style.top = `${top}px`;
      ftb.style.left = `${left}px`;
      ftb.classList.add('active');
    },

    hideFloatingToolbar() {
      const ftb = document.getElementById('ldoc-floating-toolbar');
      if (ftb) ftb.classList.remove('active');
    },

    // ── Insert Modal (+ Add) ──────────────────────────────────────────────
    openInsertModal() {
      const modal = document.getElementById('ldoc-insert-modal');
      if (modal) modal.classList.add('active');
    },

    closeInsertModal() {
      const modal = document.getElementById('ldoc-insert-modal');
      if (modal) modal.classList.remove('active');
    },

    insertBlock(blockType) {
      console.log(`[LDocStudioShell] Inserting block: ${blockType}`);
      this.closeInsertModal();

      if (window.studioAddShapeAndFocus && blockType.startsWith('shape-')) {
        const shapeName = blockType.replace('shape-', '');
        window.studioAddShapeAndFocus(shapeName);
      } else if (window.LDocLivingTypography && blockType === 'text-living') {
        window.LDocLivingTypography.insertEditorialSpread();
      } else if (window.LDocChartPro && blockType.startsWith('chart-')) {
        const chartType = blockType.replace('chart-', '');
        window.LDocChartPro.insertChart({ type: chartType });
      } else if (window.LDocEditorCore && typeof window.LDocEditorCore.insertBlock === 'function') {
        window.LDocEditorCore.insertBlock(blockType);
      } else {
        // Fallback DOM creation into canvas
        const mount = document.getElementById('ldoc-canvas-mount-point');
        if (mount) {
          const div = document.createElement('div');
          div.className = 'ed-block ' + blockType;
          div.style.cssText = 'padding: 16px; margin: 12px; background: rgba(56, 189, 248, 0.1); border: 1px solid #38bdf8; border-radius: 8px; color: #fff; cursor: pointer;';
          div.innerHTML = `<strong>${blockType.toUpperCase()}</strong><p>Interactive Living Document Element</p>`;
          mount.appendChild(div);
          this.selectObject(div);
        }
      }

      this.setSaveStatus('dirty');
      this.updateStatusStats();
    },

    // ── Pro Activation Modal ──────────────────────────────────────────────
    openProModal() {
      const modal = document.getElementById('ldoc-pro-modal');
      if (modal) modal.classList.add('active');
    },

    closeProModal() {
      const modal = document.getElementById('ldoc-pro-modal');
      if (modal) modal.classList.remove('active');
    },

    activateLicense() {
      const input = document.getElementById('ldoc-license-key-input');
      const key = input ? input.value.trim() : '';
      if (!key) {
        alert('Please enter a valid license key.');
        return;
      }

      if (window.LDocLicense && typeof window.LDocLicense.activate === 'function') {
        window.LDocLicense.activate(key);
      } else {
        localStorage.setItem('ldoc_pro_licensed', 'true');
        localStorage.setItem('ldoc_pro_key', key);
      }
      alert('License successfully activated! All Pro features unlocked.');
      this.closeProModal();
    },

    // ── Dispatch Application Actions ──────────────────────────────────────
    dispatchAction(action) {
      console.log(`[LDocStudioShell] Action dispatched: ${action}`);

      switch (action) {
        case 'undo':
          if (window.undo) window.undo();
          else if (window.LDocEditorCore) window.LDocEditorCore.undo();
          break;

        case 'redo':
          if (window.redo) window.redo();
          else if (window.LDocEditorCore) window.LDocEditorCore.redo();
          break;

        case 'save-doc':
          this.setSaveStatus('saving');
          if (window.saveDocument) window.saveDocument();
          setTimeout(() => this.setSaveStatus('saved'), 400);
          break;

        case 'export-unified':
          if (window.openExportModal) window.openExportModal();
          else if (window.LDocExport) window.LDocExport.openModal();
          else if (window.exportLDOCX) window.exportLDOCX();
          break;

        case 'presentation-mode':
          if (window.ldocPresentation && typeof window.ldocPresentation.enter === 'function') {
            window.ldocPresentation.enter();
          } else if (window.enterPresentationMode) {
            window.enterPresentationMode();
          }
          break;

        case 'toggle-theme':
          this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
          this.applyTheme(this.state.theme);
          break;

        case 'toggle-grid':
          if (window.LDocCanvasEnhancements && typeof window.LDocCanvasEnhancements.toggleGrid === 'function') {
            window.LDocCanvasEnhancements.toggleGrid();
          }
          break;

        case 'toggle-rulers':
          this.state.rulersVisible = !this.state.rulersVisible;
          const rh = document.getElementById('ldoc-ruler-h');
          const rv = document.getElementById('ldoc-ruler-v');
          const rc = document.getElementById('ldoc-ruler-corner');
          const vp = document.getElementById('ldoc-canvas-viewport');
          if (rh) rh.style.display = this.state.rulersVisible ? 'block' : 'none';
          if (rv) rv.style.display = this.state.rulersVisible ? 'block' : 'none';
          if (rc) rc.style.display = this.state.rulersVisible ? 'block' : 'none';
          if (vp) {
            vp.style.marginTop = this.state.rulersVisible ? 'var(--ldoc-ruler-size)' : '0';
            vp.style.marginLeft = this.state.rulersVisible ? 'var(--ldoc-ruler-size)' : '0';
          }
          break;

        case 'toggle-flow-guides':
          if (window.LDocLivingTypography && typeof window.LDocLivingTypography.toggleFlowGuides === 'function') {
            window.LDocLivingTypography.toggleFlowGuides();
          }
          break;

        case 'command-palette':
          if (window.LDocModals && typeof window.LDocModals.showCommandPalette === 'function') {
            window.LDocModals.showCommandPalette();
          }
          break;

        case 'toggle-pages':
          if (typeof window.togglePagesPanel === 'function') {
            window.togglePagesPanel();
          }
          break;

        case 'add-page':
          if (typeof window.addPage === 'function') {
            window.addPage();
            this.updateStatusStats();
          }
          break;

        case 'align-left':
          if (window.ldocUiAlign) window.ldocUiAlign('left');
          break;
        case 'align-center':
          if (window.ldocUiAlign) window.ldocUiAlign('center');
          break;
        case 'align-right':
          if (window.ldocUiAlign) window.ldocUiAlign('right');
          break;
        case 'align-top':
          if (window.ldocUiAlign) window.ldocUiAlign('top');
          break;
        case 'align-middle':
          if (window.ldocUiAlign) window.ldocUiAlign('middle');
          break;
        case 'align-bottom':
          if (window.ldocUiAlign) window.ldocUiAlign('bottom');
          break;

        case 'distribute-h':
          if (window.ldocUiDistribute) window.ldocUiDistribute('horizontal');
          break;
        case 'distribute-v':
          if (window.ldocUiDistribute) window.ldocUiDistribute('vertical');
          break;

        case 'group':
          if (window.ldocUiGroup) window.ldocUiGroup();
          break;
        case 'ungroup':
          if (window.ldocUiUngroup) window.ldocUiUngroup();
          break;

        case 'z-front':
          if (window.ldocUiZOrder) window.ldocUiZOrder('front');
          break;
        case 'z-back':
          if (window.ldocUiZOrder) window.ldocUiZOrder('back');
          break;

        case 'zoom-in':
          this.state.zoom = Math.min(3.0, this.state.zoom + 0.1);
          this.applyZoom();
          break;

        case 'zoom-out':
          this.state.zoom = Math.max(0.25, this.state.zoom - 0.1);
          this.applyZoom();
          break;

        case 'zoom-fit':
          this.state.zoom = 1.0;
          this.applyZoom();
          break;

        case 'insert-editorial-spread':
          if (window.LDocLivingTypography) {
            window.LDocLivingTypography.insertEditorialSpread();
          }
          break;

        case 'help-shortcuts':
          if (typeof window.toggleHelpDrawer === 'function') {
            window.toggleHelpDrawer();
          }
          break;

        default:
          console.warn(`[LDocStudioShell] Unhandled action: ${action}`);
      }
    },

    // ── Living Typography Drawer Bridge ───────────────────────────────────
    toggleLivingTypeDrawer() {
      if (window.LDocLivingTypography && typeof window.LDocLivingTypography.toggleDrawer === 'function') {
        window.LDocLivingTypography.toggleDrawer();
      } else {
        this.openShelf('living-type');
      }
    },

    // ── Zoom & Canvas Utilities ───────────────────────────────────────────
    applyZoom() {
      const zoomPct = Math.round(this.state.zoom * 100);
      const display = document.getElementById('ldoc-zoom-display');
      if (display) display.textContent = `${zoomPct}%`;

      const mount = document.getElementById('ldoc-canvas-mount-point');
      if (mount) {
        mount.style.transform = `scale(${this.state.zoom})`;
        mount.style.transformOrigin = 'center center';
      }
    },

    applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'light') {
        document.body.classList.add('ldoc-theme-light');
      } else {
        document.body.classList.remove('ldoc-theme-light');
      }
    },

    setSaveStatus(status) {
      this.state.saveStatus = status;
      const badge = document.getElementById('ldoc-save-status');
      const text = document.getElementById('ldoc-save-text');
      if (!badge || !text) return;

      if (status === 'saved') {
        badge.classList.remove('dirty');
        text.textContent = 'Saved locally';
      } else if (status === 'saving') {
        badge.classList.remove('dirty');
        text.textContent = 'Saving...';
      } else {
        badge.classList.add('dirty');
        text.textContent = 'Unsaved changes';
      }
    },

    updateStatusStats() {
      const stats = document.getElementById('ldoc-status-stats');
      const pageCountEl = document.getElementById('ldoc-status-page-count');
      if (!stats) return;

      const blockCount = document.querySelectorAll('.ed-block, [data-block-id]').length;
      stats.textContent = `1 Page • ${blockCount} Blocks • Live`;
      if (pageCountEl) pageCountEl.textContent = 'Pages (1/1)';
    },

    applyStyle(property, value) {
      if (this.state.selectedObject) {
        this.state.selectedObject.style[property] = value;
        this.setSaveStatus('dirty');
      }
    },

    applyPretextColumns(count) {
      if (this.state.selectedObject && window.LDocLivingTypography) {
        window.LDocLivingTypography.setColumns(this.state.selectedObject, parseInt(count, 10));
        this.setSaveStatus('dirty');
      }
    },

    applyObstacleMargin(margin) {
      const valEl = document.getElementById('ldoc-margin-val');
      if (valEl) valEl.textContent = `${margin}px`;
      if (this.state.selectedObject && window.LDocLivingTypography) {
        window.LDocLivingTypography.setObstacleMargin(this.state.selectedObject, parseInt(margin, 10));
        this.setSaveStatus('dirty');
      }
    }
  };

  // Auto-init on DOMContentLoaded or immediate if DOM is already ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    LDocStudioShell.init();
  } else {
    document.addEventListener('DOMContentLoaded', () => LDocStudioShell.init());
  }

  window.LDocStudioShell = LDocStudioShell;

})(window);
