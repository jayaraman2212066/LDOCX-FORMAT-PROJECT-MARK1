# LDOCX UI Layering & Stacking Architecture Specification

## 1. Executive Summary

This architecture document defines the standardized, deterministic stacking-context hierarchy and CSS layering tokens across the entire **LDOCX** product suite (Studio, Creator, Standalone Viewer, Live Studio, Template Hub, and Universal Presentation Mode).

Prior to this architecture, arbitrary numeric `z-index` declarations (e.g., `z-index: 10`, `100`, `9999`, `999999`) and DOM stacking-context entrapment caused severe UI/UX defects—including drawers trapped beneath backdrops, modals rendered inside hidden containers, and presentation exit buttons obscured by WebGL or SVG canvas elements.

This specification establishes an immutable **18-Tier Layer Token Hierarchy**, strict **DOM Portal/Hoisting Rules**, and **Mathematical Invariant Guarantees** governing all visual surfaces.

---

## 2. The 18-Tier Standard Layer Hierarchy

All CSS `z-index` properties across all LDOCX surfaces are strictly bound to the standard tokens defined in [`ldoc-layer-tokens.css`](file:///D:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/ldoc-layer-tokens.css). Direct numeric `z-index` literals are disallowed.

| Tier # | CSS Variable Token | Numeric Value | Classification & Role | Typical Components / Targets |
|---|---|---|---|---|
| **0** | `--z-sink` | `-1` | Recessed background layers | Grid patterns, decorative textures |
| **1** | `--z-base-doc` | `0` | Base document flow | Root canvas, standard document body |
| **2** | `--z-canvas-underlay` | `10` | Canvas background elements | Page shadows, bleed indicators, artboard guides |
| **3** | `--z-canvas-nodes` | `20` | Dynamic canvas nodes & shapes | Text blocks, vector shapes, diagrams, media cards |
| **4** | `--z-interactive-widgets`| `30` | Interactive runtime embeds | Live 3D WebGL scenes, reactive calculators, quiz widgets |
| **5** | `--z-selection-overlay` | `100` | Transform handles & bounding boxes| Selection outlines, rotate knobs, resize handles |
| **6** | `--z-docked-panel` | `200` | Persistent dock sidebars | Property inspector, outline tree, layers pane |
| **7** | `--z-sticky-bar` | `300` | Fixed navigation & action headers | Ribbon toolbar, window title bar, bottom status bar |
| **8** | `--z-floating-toolbar` | `400` | Floating in-canvas toolbars | Rich-text format bar, quick-align toolbar |
| **9** | `--z-dropdown` | `500` | Pop-up select menus & pickers | Font picker, color picker dropdown, shape picker |
| **10** | `--z-popover` | `600` | Transient floating annotations | Hover tooltips, formula helpers, node inspection popovers |
| **11** | `--z-drawer-backdrop` | `800` | Drawer dimming backdrops | `#drawer-backdrop`, `#help-drawer-backdrop`, `#pages-overlay` |
| **12** | `--z-drawer-content` | `850` | Slide-out side drawers | `#fx-wizard-sidebar`, `#ai-helper-panel`, `#help-drawer`, `#pages-panel` |
| **13** | `--z-modal-backdrop` | `1000` | Modal dark backdrops | `#ldoc-modal-backdrop`, cloud modal dimmers |
| **14** | `--z-modal-content` | `1050` | Standard interactive dialogs | Template preview, export wizard, asset manager |
| **15** | `--z-spotlight-modal` | `1100` | High-priority spotlight overlays | Spotlight Command Palette (`Ctrl+Shift+P` / `F1`) |
| **16** | `--z-toast-notification`| `1200` | Toast feedback notifications | `#ldoc-toast-root`, floating status alerts |
| **17** | `--z-presentation-hud` | `1400` | Universal Presentation HUD | `#ldoc-pres-controls`, Exit button, fit-to-screen button |
| **18** | `--z-critical-overlay` | `9000` | System error & crash screens | WebGL fatal crash alert, critical recovery prompt |
| **Gate**| `--z-license-gate` | `1000000` | Mandatory Commercial Gate | `#license-activation-modal`, WinForms / Electron shield |

---

## 3. Core Architectural Invariants

### Invariant 1: Drawer-Backdrop Strict Supremacy
$$\text{Drawer Content } (850) > \text{Drawer Backdrop } (800)$$
Backdrop layers dim the underlying canvas and docked toolbars (Tier 1–7), but must **never** occlude drawer content. Slide-out drawer panels must always be interactive upon opening without backdrop clicks intercepting their touch/mouse events.

### Invariant 2: Modal Over Drawer Supremacy
$$\text{Modal Content } (1050) > \text{Drawer Content } (850) > \text{Drawer Backdrop } (800)$$
When an action inside a drawer triggers a modal (such as an asset selector or element palette), the modal and its backdrop must render cleanly on top of the open drawer, preventing dual-focus confusion.

### Invariant 3: Spotlight Omnipresence
$$\text{Spotlight Command Palette } (1100) > \text{Modal Content } (1050)$$
The spotlight command palette is an emergency global navigation tool accessible from anywhere. It hovers above standard modals so users can search commands or switch documents even when a dialog is active.

### Invariant 4: Universal Presentation Non-Obscuration
$$\text{Presentation HUD } (1400) > \text{All Application Chrome } (0 - 1200)$$
When in Presentation Mode, the presentation control bar (`#ldoc-pres-controls`) and Exit button (`#ldoc-btn-exit`) must maintain 100% clickability and visibility above all 3D WebGL scenes, canvas animations, and reactive text reflows. Under no condition may full-screen canvas elements render in front of the exit controls.

### Invariant 5: License Gate Inviolability
$$\text{License Gate Shield } (1000000) \gg \text{All Other Tiers } (0 - 9000)$$
The commercial licensing gate is legally and functionally paramount. When an unactivated workstation is detected, `#license-activation-modal` covers all viewport elements, blocking hotkeys and interactions until unlocked.

---

## 4. DOM Portal & Hoisting Rules

Stacking-context entrapment occurs when a container element has CSS properties that establish a new stacking context (such as `transform`, `opacity < 1`, `filter`, `perspective`, or `contain: paint`). Any child element inside such a container—regardless of whether its `z-index` is `99999`—is mathematically trapped within that parent's layer rank.

### Required DOM Hierarchy
To guarantee zero stacking-context traps:
1. **Global Portal Roots**: Every HTML document MUST include the dedicated overlay portals as direct children of `<body>`:
   ```html
   <div id="ldoc-overlay-root"></div>
   <div id="ldoc-toast-root"></div>
   ```
2. **Backdrops and Slide-out Drawers**: Drawers (`#pages-panel`, `#help-drawer`, `#fx-wizard-sidebar`) and their backdrops (`#pages-overlay`, `#drawer-backdrop`, `#help-drawer-backdrop`) MUST be direct children of `<body>` or mounted in `#ldoc-overlay-root`. They MUST NEVER be nested inside `#main`, `.app-container`, or any scrollable layout wrapper.
3. **Modal Containers**: All floating modals, alert boxes, and spotlight palettes must mount into `#ldoc-overlay-root`.

---

## 5. Developer Tooling: UI Layer Inspector

Pressing <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> in any LDOCX surface toggles the real-time **UI Layer Inspector**:
- Displays the currently hovered element's tag name, ID, and class hierarchy.
- Evaluates and prints computed `z-index`, position mode (`fixed`, `absolute`, `relative`), and the nearest stacking-context ancestor.
- Flags any element using an unauthorized numeric `z-index` that is not registered in the 18-tier scale.
