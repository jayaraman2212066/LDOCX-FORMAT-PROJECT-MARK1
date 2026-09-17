# LDOCX — Canva Pro & Business-Class Feature Matrix

**Document Version**: `v3.0.0`  
**Platform**: LDOCX Living Document Format & Studio  
**Audit Date**: September 2026  
**Status**: Fully Implemented & Verified in Production  

---

## 1. Overview & Capability Summary

This matrix audits the creative, graphic, spatial, and living-document capabilities implemented across the LDOCX format, Editor Studio, and Viewer runtimes. Every capability is engineered to match or exceed Canva Pro and Canva for Enterprise benchmarks while remaining 100% portable within open, single-file `.ldocx` archives and guaranteed by zero-drift mathematical layout (`@chenglou/pretext@0.0.9`).

| Domain | Canva Pro / Business Benchmark | LDOCX Implementation | Production Status | Test Suite |
| :--- | :--- | :--- | :--- | :--- |
| **Vector Shapes** | 10+ standard geometric primitives, stroke styling, fill gradients, drop-shadows | 11 parametric vector shapes with linear/radial SVG gradients, drop-shadow filters, corner radius, rotation, and center labels | ✅ Operational | Section 12 |
| **Typography & Effects** | Curved text, text styles, outline, shadow, neon, font pairing presets | Deterministic Pretext arithmetic line-breaking, curved/radial text, gradient text, neon glow, drop-shadows, background pill capsules, brand font tokens | ✅ Operational | Section 1, 2, 4, 10, 12 |
| **Media & Image Editing** | Non-destructive image adjustments, background masks, aspect ratio locking, flips | Non-destructive CSS/SVG filters (brightness, contrast, saturation, blur, grayscale, sepia, hue-rotate), clipping shapes (circle, hex, star), flip H/V | ✅ Operational | Section 12 |
| **Canvas & Layout Tools** | Smart magnetic guides, grid snapping, multi-object alignment, distribution, z-indexing | Snap-to-grid (8px/16px), smart alignment guides, distribute horizontal/vertical, 4-tier z-ordering, grouping, locking, canvas rulers | ✅ Operational | Section 4, 12, 13 |
| **Brand Kits & Tokens** | Brand colors, font pairings, logo assets, design tokens | Dynamic Brand Kit system (tokens, palettes, primary/secondary fonts), WCAG 2.2 AA/AAA automated contrast compliance analyzer | ✅ Operational | Section 12 |
| **Reactive Computations** | Not available in Canva (static exports only) | Safe AST recursive-descent math parser (zero `eval()`), topological reactive DAG with cycle detection, 4 physics/finance simulation presets | ✅ Operational | Section 13 |
| **3D Spatial Models** | Not available in Canva (flat 2D/video only) | Three.js WebGL runtime with parametric exploded views, scene graph tree inspector, part isolation, screen-projected annotation pins | ✅ Operational | Section 13 |
| **Interactive Assessment**| Not available in Canva (requires third-party embeds) | Native quiz block engine with single-choice, multiple-choice, true/false, and numeric validation, auto-grading, hints, and explanations | ✅ Operational | Section 13 |
| **Document Longevity** | Proprietary cloud-locked format | Open dual-container zip archive (v1, v2, v3), RFC 6962 SHA-256 Merkle tree verification, standalone 20-year archival `fallback.html` | ✅ Operational | Section 8, 14 |

---

## 2. Detailed Creative Engine Features

### 2.1 Vector Shapes Engine (`src/ldoc-shape-engine.js`)

| Feature | Supported Parameters | Capabilities | Compliance / Engine |
| :--- | :--- | :--- | :--- |
| **Primitives (11)** | `rect`, `rounded_rect`, `circle`, `ellipse`, `triangle`, `star`, `polygon_hexagon`, `callout_speech`, `callout_thought`, `arrow_right`, `arrow_double` | Parametric coordinate generation, dynamic vertex calculation, custom corner radius. | SVG 2.0 / Vector DOM |
| **Gradients** | `linear`, `radial`, `angle`, `stops: [{ offset, color }]` | Generates embedded `<defs><linearGradient>` and `<radialGradient>` elements with unique IDs. | W3C SVG Gradients |
| **Drop Shadows** | `dx`, `dy`, `blur`, `color`, `spread` | High-fidelity `<filter id="...">` with Gaussian blur and SVG merge nodes. | SVG Filter Effects |
| **Stroke Styling** | `stroke`, `strokeWidth`, `strokeDasharray` (solid, dashed, dotted) | Non-scaling stroke borders with customizable joins (`round`, `miter`). | Vector Stroke Spec |
| **Labeling** | `label`, `labelColor`, `labelFontSize`, `labelFontFamily` | Centered text inside shapes with auto-wrap calculation. | Pretext / SVG `<text>` |
| **Geometry & Transform** | `rotation` (0°–360°), `opacity` (0.0–1.0), `skew` | Matrix-free standard rotation around element center. | Hardware Accelerated CSS |

### 2.2 Advanced Typography & Text Effects (`src/ldoc-text-layout.js` & `src/ldoc-shape-engine.js`)

| Feature | Description | Technical Implementation |
| :--- | :--- | :--- |
| **Arithmetic Line Breaking** | Deterministic line-breaking without browser layout engine variance. Zero drift between macOS, Windows, Linux, iOS, and Android. | Pinned strictly to `@chenglou/pretext@0.0.9`. Single-layer float calculation with sub-pixel rounding. |
| **Curved & Arc Text** | Render text along a circular arc with configurable radius and sweep angle. | Pretext character-by-character advance calculation positioned via SVG `<textPath>` or rotational transforms. |
| **Gradient Text** | Multi-stop linear and radial gradient fills across headings and display text. | Background clipping (`-webkit-background-clip: text`) with SVG gradient fallback. |
| **Neon Glow** | Multi-layered emissive text shadows simulating glowing signage. | Stacked `text-shadow` layers with variable spread and luminosity. |
| **Pill & Capsule Highlighting** | Background pill cards behind text spans with padding and corner radiuses. | Inline SVG pill bounding boxes or styled inline-block spans. |
| **Exclusion Polygons** | Body text wraps fluidly around vector shapes, image cards, and 3D viewports. | Algorithmic polygon carving via `LdocTextLayout.layoutTextWithExclusion()`. |
| **Multi-Column Balancing** | Multi-column layouts balanced for uniform column heights. | Binary search target height calculation via Pretext arithmetic layout. |

### 2.3 Non-Destructive Media & Image Filters

| Filter | Range | Non-Destructive Behavior |
| :--- | :--- | :--- |
| **Brightness** | `0%` – `200%` (default `100%`) | Stored as JSON property on block; original image file untouched. |
| **Contrast** | `0%` – `200%` (default `100%`) | Applied at render-time via CSS filter pipelines. |
| **Saturation** | `0%` – `200%` (default `100%`) | Rendered identically in Viewer and PDF rasterization pipelines. |
| **Blur** | `0px` – `20px` (default `0px`) | Smooth Gaussian blur filter without edge clipping. |
| **Grayscale / Sepia** | `0%` – `100%` (toggleable) | Instant monochrome or vintage sepia tone conversion. |
| **Hue-Rotate** | `0deg` – `360deg` | Parametric color shifting. |
| **Clipping Masks** | `rect`, `circle`, `hexagon`, `star` | Non-destructive clip-path applying geometric framing to images. |
| **Orientation Flips** | `flipH: boolean`, `flipV: boolean` | Hardware-accelerated CSS `scaleX(-1)` / `scaleY(-1)` transforms. |

---

## 3. Canvas Manipulation & Layout Suite (`src/ldoc-editor-core.js`)

| Capability | Methods / APIs | Details |
| :--- | :--- | :--- |
| **Selection & Multi-Select** | `select(id, multi)`, `selectAll()`, `clearSelection()` | Single-click selection, Shift+click multi-select, rubber-band marquee selection. |
| **Alignment (6 Axes)** | `alignSelected('left'\|'center'\|'right'\|'top'\|'middle'\|'bottom')` | Aligns all selected items relative to their collective bounding box. |
| **Distribution** | `distributeSelected('horizontal'\|'vertical')` | Equalizes whitespace gaps between 3 or more selected elements. |
| **Z-Order Stacking** | `bringToFront()`, `sendToBack()`, `bringForward()`, `sendBackward()` | Re-indexes blocks in document AST array with boundary clamping. |
| **Grouping / Ungrouping** | `groupSelected()`, `ungroupSelected()` | Creates composite group nodes retaining child relative coordinates. |
| **Element Locking** | `toggleLock(id)` | Prevents accidental dragging, resizing, or deletion of finalized background elements. |
| **Grid Snapping** | `setGrid(enabled, size)` (e.g. 8px, 16px) | Snaps dragging coordinates mathematically (`Math.round(val / size) * size`). |
| **Rulers & Smart Guides** | `setRulers(enabled)` | Renders interactive top/left pixel rulers with crosshair cursor tracking. |
| **Brand Kit Tokens** | `setBrandKit(kit)`, `applyBrandKit()` | Enforces enterprise typography and color palettes across document elements. |
| **WCAG 2.2 Contrast** | `validateContrast(fg, bg)` | Calculates relative luminance according to W3C formulas; returns ratio and AA/AAA pass status. |

---

## 4. Living Document Runtime Engine

### 4.1 Reactive Computation DAG (`src/ldoc-reactive-engine.js`)

Unlike static PDF or Canva designs, LDOCX documents are computable applications:
- **Zero `eval()` Security**: Fully parsed using an AST recursive-descent parser (`parseExpression`) supporting arithmetic operators (`+`, `-`, `*`, `/`, `%`), comparison (`==`, `!=`, `<`, `>`, `<=`, `>=`), logical operators (`&&`, `||`, `!`), ternary conditionals (`cond ? a : b`), and math functions (`sin`, `cos`, `tan`, `sqrt`, `pow`, `abs`, `floor`, `ceil`, `round`, `min`, `max`, `clamp`, `deg2rad`, `rad2deg`).
- **Topological DAG**: Evaluates dependencies in topological order (`getEvaluationOrder`).
- **Cycle Detection**: Catches circular formulas (e.g., $A \rightarrow B \rightarrow A$) gracefully without infinite loops or browser freezing.
- **Built-In Simulation Presets**:
  1. `projectile`: Computes projectile trajectory ($x, y$), range, flight time, and max height given initial velocity and launch angle.
  2. `ohms_law`: Computes voltage, current, resistance, and power ($P = V \times I$).
  3. `harmonic_oscillator`: Computes damped oscillating position and frequency over time.
  4. `compound_interest`: Computes final investment balance and accrued interest over years.

### 4.2 3D Spatial Model Inspector (`src/ldoc-3d-inspector.js`)

- **Parametric Exploded View**: Displaces sub-meshes outwards from the model's bounding box center along their normalized direction vectors using an interactive slider (0.0 to 2.0).
- **Scene Graph Hierarchy**: Extracts the complete Three.js hierarchy tree (`name`, `type`, `id`, `children`, `materialCount`, `triangleCount`) for visual sidebar inspection.
- **Part Isolation & Focus**: Highlights individual components, dims surrounding parts to 20% opacity, and frames the camera on the target sub-mesh.
- **Screen-Projected Annotation Pins**: World-space 3D markers that automatically project their coordinates to screen $(x, y)$ pixels during camera rotation and zoom.

### 4.3 Diagnostic & Interactive Quizzes (`src/ldoc-quiz-engine.js`)

- **Question Types**: Single-choice (radio), multiple-choice (checkboxes), true/false, and numeric tolerance validation.
- **Feedback & Explanations**: Instant visual feedback (green/red), point scoring, retry capability, and markdown explanations.
- **State Serialization**: Quiz progress and scores persist in local state or document exports.

---

## 5. Security & Isolation Architecture

| Subsystem | Security Mechanism | Protection Target |
| :--- | :--- | :--- |
| **Math & Reactive Engine** | Recursive descent AST parser | Zero `eval()`, zero `Function()`, prevents prototype pollution and remote code execution. |
| **Document Validator** | `LdocValidator.validateDocument(doc)` | Rejects malformed structures, duplicate IDs, and invalid block types before execution. |
| **Security Sanitizer** | `LdocValidator.sanitizeBlock(block)` | Strips `<script>`, `<iframe>`, `javascript:` URLs, and `on*` DOM event attributes. |
| **Subsystem Error Boundaries** | `safeRenderBlock(block, container, renderFn)` | Traps component crashes (corrupted 3D models, bad image URLs, broken SVG); renders isolated fallback cards without blanking the screen. |
| **Sandboxed Iframes** | `sandbox="allow-scripts" csp="..."` | Isolates web widgets and custom simulations from the parent application origin. |
| **Merkle Integrity Verification** | RFC 6962 SHA-256 tree hashing | Detects unauthorized tampering or corruption of individual page blocks or media assets. |

---

## 6. Verification Status

All features listed in this matrix have been verified across the 14 test suites in `tests/run_all_pretext_master_tests.js`:
- **Section 10**: Pretext UI/UX 8 Master Features — **PASSED**
- **Section 11**: Multi-User Concurrency & Integrity — **PASSED**
- **Section 12**: Canva Pro Creative Engine & Vector Shapes — **PASSED**
- **Section 13**: Living Document Runtime (Reactive DAG, 3D & Quiz) — **PASSED**
- **Section 14**: Production Safety, QA & Corpus Verification — **PASSED**
