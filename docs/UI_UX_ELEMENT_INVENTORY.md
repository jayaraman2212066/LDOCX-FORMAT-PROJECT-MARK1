# LDOCX UI/UX Element Inventory & Layering Mapping

This document provides a comprehensive inventory of all primary UI/UX components across all 6 LDOCX application surfaces. Each component is audited for its structural parent, CSS z-index token binding, empirical hit-test pass rate via Chrome DevTools Protocol (CDP), and interactive visibility states.

---

## 1. Visual Creator Surface (`creator.html`)

| Element Selector / ID | Functional Role | Structural Parent | Z-Index Token Binding | Computed Z-Index | CDP Hit-Test Status | Visibility / Interactive Behavior |
|---|---|---|---|---|---|---|
| `#creator-canvas` | Main vector & 3D canvas | `document.body` | `--z-base-doc` | `0` | PASS | Always visible, viewport pan/zoom target |
| `.cr-toolbar-top` | Main Ribbon Header Toolbar | `document.body` | `--z-sticky-bar` | `300` | PASS | Sticky header with primary creation actions |
| `#cr-shape-dropdown-menu` | Shape Insertion Menu | `.cr-toolbar-top` | `--z-dropdown` | `500` | PASS | Popover on button click |
| `#drawer-backdrop` | Universal Drawer Dimmer | `document.body` | `--z-drawer-backdrop` | `800` | PASS | Appears on drawer open, dims canvas, click to dismiss |
| `#fx-wizard-sidebar` | Special FX & Animation Drawer | `document.body` | `--z-drawer-content` | `850` | PASS (Topmost hit) | Slides in from right, strictly sits above backdrop |
| `#popup-elements-modal` | Elements & Template Palette | `#ldoc-overlay-root`| `--z-modal-content` | `1050` | PASS (Topmost hit) | Centered modal with glassmorphic backdrop |
| `#ldoc-pres-controls` | Universal Presentation HUD | `document.body` | `--z-presentation-hud` | `1400` | PASS | Floats at bottom center during slide presentations |
| `#ldoc-btn-exit` | Presentation Mode Exit CTA | `#ldoc-pres-controls` | `--z-presentation-hud` | `1400` | PASS (100% Clickable)| Click restores normal workspace layout |
| `#ldoc-overlay-root` | Global Modal Portal | `document.body` | `--z-modal-backdrop` | N/A (Root) | PASS | Direct child of `<body>`, hosts dialogs |
| `#ldoc-toast-root` | Global Non-blocking Alerts | `document.body` | `--z-toast-notification` | `1200` | PASS | Bottom-right pointer-events-pass-through container |

---

## 2. Studio Surface (`index.html`)

| Element Selector / ID | Functional Role | Structural Parent | Z-Index Token Binding | Computed Z-Index | CDP Hit-Test Status | Visibility / Interactive Behavior |
|---|---|---|---|---|---|---|
| `#desktop-menubar` | Window & File Menubar | `document.body` | `--z-sticky-bar` | `300` | PASS | Top edge sticky titlebar |
| `#main` | Central workspace container | `document.body` | `--z-base-doc` | `0` | PASS | Flex container for canvas and dock panels |
| `#pages-overlay` | Slide Thumbnail Drawer Backdrop | `document.body` | `--z-drawer-backdrop` | `800` | PASS | Hoisted to body; dims workspace when open |
| `#pages-panel` | Slide Thumbnails & Pages Drawer | `document.body` | `--z-drawer-content` | `850` | PASS (Topmost hit) | Hoisted to body; zero stacking-context traps |
| `#help-drawer-backdrop`| Dedicated Help Drawer Dimmer | `document.body` | `--z-drawer-backdrop` | `800` | PASS | Independent backdrop for F1 help drawer |
| `#help-drawer` | Help & Keyboard Shortcuts Drawer | `document.body` | `--z-drawer-content` | `850` | PASS (Topmost hit) | Slide-out help drawer from right edge |
| `#ldoc-command-palette-modal` | Spotlight Command Palette | `#ldoc-overlay-root`| `--z-spotlight-modal` | `1100` | PASS (Input focused)| Centered search dialog with quick navigation |
| `#license-activation-modal` | Workstation Commercial Gate | `document.body` | `--z-license-gate` | `1000000` | PASS | Displays on unactivated profiles; hides when licensed |
| `#ldoc-overlay-root` | Hoisted Overlay Root | `document.body` | `--z-modal-backdrop` | N/A (Root) | PASS | Direct child of `<body>` |
| `#ldoc-toast-root` | Hoisted Toast Notification Root | `document.body` | `--z-toast-notification` | `1200` | PASS | Direct child of `<body>` |

---

## 3. Live Studio Surface (`live-studio.html`)

| Element Selector / ID | Functional Role | Structural Parent | Z-Index Token Binding | Computed Z-Index | CDP Hit-Test Status | Visibility / Interactive Behavior |
|---|---|---|---|---|---|---|
| `#ldoc-status-bar` | Modern Bottom Status Bar | `document.body` | `--z-sticky-bar` | `300` | PASS | Fixed bottom status and zoom indicator |
| `#pages-overlay` | Live Document Pages Backdrop | `document.body` | `--z-drawer-backdrop` | `800` | PASS | Hoisted to body; dims live canvas |
| `#pages-panel` | Live Document Pages Drawer | `document.body` | `--z-drawer-content` | `850` | PASS (Topmost hit) | Immediate sibling to overlay; translates smoothly |
| `#demo-noteup-modal` | Demo Capabilities Modal | `#ldoc-overlay-root`| `--z-modal-backdrop` | `1000` | PASS | Standardized modal layer; dismissible via close |
| `#pro-features-modal` | Pro Features Overview Modal | `#ldoc-overlay-root`| `--z-modal-content` | `1050` | PASS | Standardized modal layer; dismissible via close |
| `#ldoc-overlay-root` | Live Studio Portal Container | `document.body` | `--z-modal-backdrop` | N/A (Root) | PASS | Direct child of `<body>` |
| `#ldoc-toast-root` | Live Studio Toast Container | `document.body` | `--z-toast-notification` | `1200` | PASS | Direct child of `<body>` |

---

## 4. Standalone Viewer Surface (`viewer.html`)

| Element Selector / ID | Functional Role | Structural Parent | Z-Index Token Binding | Computed Z-Index | CDP Hit-Test Status | Visibility / Interactive Behavior |
|---|---|---|---|---|---|---|
| `#viewer-viewport` | Document Render Viewport | `document.body` | `--z-base-doc` | `0` | PASS | Pan/zoom view of living documents |
| `#pages-overlay` | Viewer Pages Backdrop | `document.body` | `--z-drawer-backdrop` | `800` | PASS | Hoisted to body |
| `#pages-panel` | Viewer Pages Drawer | `document.body` | `--z-drawer-content` | `850` | PASS | Hoisted to body |
| `#ldoc-pres-controls` | Universal Presentation HUD | `document.body` | `--z-presentation-hud` | `1400` | PASS | Floating presentation control bar |
| `#ldoc-btn-exit` | Exit Presentation Button | `#ldoc-pres-controls` | `--z-presentation-hud` | `1400` | PASS (Topmost hit) | Direct child of body hierarchy; never blocked |
| `#ldoc-overlay-root` | Viewer Overlay Root | `document.body` | `--z-modal-backdrop` | N/A (Root) | PASS | Direct child of `<body>` |
| `#ldoc-toast-root` | Viewer Toast Notification Root | `document.body` | `--z-toast-notification` | `1200` | PASS | Direct child of `<body>` |

---

## 5. Template Hub Surface (`templates.html`)

| Element Selector / ID | Functional Role | Structural Parent | Z-Index Token Binding | Computed Z-Index | CDP Hit-Test Status | Visibility / Interactive Behavior |
|---|---|---|---|---|---|---|
| `.th-header` | Template Hub Header Nav | `document.body` | `--z-sticky-bar` | `300` | PASS | Sticky header with category filters |
| `.th-grid` | Responsive Template Grid | `document.body` | `--z-base-doc` | `0` | PASS | Template cards layout |
| `.tpl-card-preview-modal`| Fullscreen Template Inspector | `#ldoc-overlay-root`| `--z-modal-content` | `1050` | PASS | Interactive modal dialog with template preview |
| `#ldoc-overlay-root` | Template Hub Overlay Root | `document.body` | `--z-modal-backdrop` | N/A (Root) | PASS | Direct child of `<body>` |
| `#ldoc-toast-root` | Template Hub Toast Root | `document.body` | `--z-toast-notification` | `1200` | PASS | Direct child of `<body>` |

---

## 6. Universal Presentation Mode (`ldoc-presentation-runtime.js`)

| Element Selector / ID | Functional Role | Structural Parent | Z-Index Token Binding | Computed Z-Index | CDP Hit-Test Status | Visibility / Interactive Behavior |
|---|---|---|---|---|---|---|
| `body.ldoc-presenting` | Fullscreen Presentation State | `document.documentElement`| N/A | N/A | PASS | Enters clean canvas, suppresses chrome |
| `#ldoc-pres-controls` | Floating Floating HUD Bar | `document.body` | `--z-presentation-hud` | `1400` | PASS (Topmost hit) | Semi-transparent floating glassmorphic bar |
| `#ldoc-btn-prev` | Previous Slide Button | `#ldoc-pres-controls` | `--z-presentation-hud` | `1400` | PASS | Interactive navigation control |
| `#ldoc-btn-next` | Next Slide Button | `#ldoc-pres-controls` | `--z-presentation-hud` | `1400` | PASS | Interactive navigation control |
| `#ldoc-btn-fit` | Fit to Screen Mode Toggle | `#ldoc-pres-controls` | `--z-presentation-hud` | `1400` | PASS | Auto-scales slide canvas |
| `#ldoc-btn-exit` | Exit Presentation Mode | `#ldoc-pres-controls` | `--z-presentation-hud` | `1400` | PASS (Topmost hit) | Guaranteed top-level clickable exit target |
