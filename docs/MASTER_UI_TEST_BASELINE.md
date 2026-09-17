# LDOCX Master UI Test Baseline

## Overview
This baseline document records the architecture, routes, build and test pipelines, test suites, fixture corpus, and known limitations of the LDOCX production project prior to the execution of the Master End-to-End QA Test Run.

---

## 1. System & Architecture Overview
- **Project**: LDOCX Living Document Format & Studio Platform
- **Version**: 3.0.0
- **Primary Package**: `ldocx-living-document-studio`
- **Core Architecture**:
  - Zero-dependency client runtime with canvas-based arithmetic layout via `@chenglou/pretext@0.0.9`.
  - Native modular engines:
    - `LdocTextLayout` (`ldoc-text-layout.js`): Deterministic multi-line text measurement and line-breaking.
    - `LDocShapeEngine` (`ldoc-shape-engine.js`): 12 geometric vector primitives, SVG path generation, solid/linear/radial gradients.
    - `LDocReactiveEngine` (`ldoc-reactive-engine.js`): Safe AST math evaluator (zero-eval), topological dependency DAG, STEM simulation models.
    - `LDocQuizEngine` (`ldoc-quiz-engine.js`): Self-grading quiz runtime, question evaluation, hint/explanation handling.
    - `LDoc3DInspector` (`ldoc-3d-inspector.js`): WebGL/Three.js exploded views (0.0–2.0 factor), parts hierarchy, lighting presets.
    - `LDocEditorCore` (`ldoc-editor-core.js`): Selection, 6-axis alignment, H/V distribution, grouping/ungrouping, z-ordering, undo/redo history, dirty tracking, crash recovery snapshot.
    - `LDocValidator` (`ldoc-validator.js`): Schema validation and XSS security sanitizer.
    - `LDocParser` (`ldoc-parser.js`): `.ldocx` binary ZIP unpacking and single-layer JSON AST parsing.
    - `LDocExportEngine` (`ldoc-export-engine.js`): Standalone HTML packaging, JSON AST serialization, and PDF generation.

---

## 2. Current Routes & Entry Points
Configured in `server.js` and `vercel.json` (with dual static mirrors in `public/` and `app/viewer/`):

| Route / Path | File Source | Description |
| :--- | :--- | :--- |
| `/` | `index.html` | Platform landing page, showcase player, and marketing hero |
| `/studio` | `studio.html` | Flagship full-featured Living Document Studio & Canvas |
| `/creator` | `creator.html` | Slide-based visual document creator & presentation authoring |
| `/viewer` | `viewer.html` | High-fidelity standalone document viewer & interactive runner |
| `/live-studio` | `live-studio.html` | Real-time interactive canvas studio environment |
| `/docs` | `docs.html` | Developer documentation & format specification |
| `/format` | `format.html` | LDOCX specification & architectural overview |
| `/features` | `features.html` | Comprehensive platform feature showcase |
| `/pricing` | `pricing.html` | Pricing models and licensing details |
| `/models` | `models.html` | 3D model gallery and asset showcase |
| `/templates` | `templates.html` | Template picker and showcase |
| `/privacy` | `privacy.html` | Privacy policy |
| `/terms` | `terms.html` | Terms of service |
| `/security` | `security.html` | Security policy and architecture guide |
| `/refund` | `refund.html` | Refund policy |
| `/license` | `license.html` | Apache 2.0 and third-party license terms |
| `/all-features-showcase.ldocx` | `all-features-showcase.ldocx` | 18-page flagship showcase document |

---

## 3. Server, Build & Test Commands

### Local Server Command
```powershell
node server.js
# Or: npm start / npm run serve
# Port: 3000 (default) or $env:PORT
```

### Build Commands
```powershell
# Master build pipeline (compiles text layout, syncs modules, builds public and packages)
npm run build
# Or: node build.js

# Sub-builds:
node build_text_layout.js   # Compiles src/ldoc-text-layout.js using esbuild
node build_static.js        # Assembles public/ and app/viewer/ dual routes
python package_dist.py      # Packages platform distribution zips
```

### Test Commands
```powershell
# Comprehensive test suite
npm test
# Executes: node packages/ldoc-sdk/test.js && node tests/run_all_pretext_master_tests.js

# UI / Browser CDP Test Suites:
node tests/test_ui_authoring_smoketest.js    # Browser-in-the-loop CDP authoring smoke test
node tests/audit_ui_controls.js             # UI controls and inspectors audit
```

---

## 4. Existing Test Suites
The test infrastructure consists of 14 master test sections plus SDK tests:

1. `packages/ldoc-sdk/test.js`: SDK core methods, parsing, and serialization.
2. `Section 1` (`tests/test_section1_unit.js`): `LdocTextLayout` arithmetic unit tests and caching.
3. `Section 2` (`tests/test_section2_cross_surface.js`): Zero text drift across Viewer, Studio, and PDF.
4. `Section 3` (`tests/test_section3_performance.js`): Runtime & mount performance, zero forced layout thrashing.
5. `Section 4` (`tests/test_section4_editor.js`): Editor auto-grow, multi-line centering, 3D obstacle text wrap.
6. `Section 5 & 6` (`tests/test_section5_and_6_viewer_pdf.js`): Viewer viewport rendering and PDF visual verification.
7. `Section 7` (`tests/test_section7_cross_platform.js`): Soft-hyphenation, unicode i18n, OS conformance.
8. `Section 8` (`tests/test_section8_arch.js`): Architecture conformance, pretext encapsulation, zero external drift.
9. `Section 9` (`tests/test_section9_regression.js`): Historic regression sweep (B1 through B9).
10. `Section 10` (`tests/test_pretext_ui_ux.js`): Pretext UI/UX 8 master features (radial text, column balance, auto-grow).
11. `Section 11` (`tests/test_section11_multi_user_load_integrity.js`): Multi-user concurrency, conflict resolution, Merkle tree.
12. `Section 12` (`tests/test_canva_pro_features.js`): Canva Pro creative engine, 12 vector shapes, gradients, brand tokens, WCAG.
13. `Section 13` (`tests/test_living_document_runtime.js`): Living document runtime, reactive DAG, safe math AST, 3D exploded views, quiz engine.
14. `Section 14` (`tests/test_production_safety_qa.js`): Production safety, schema validator, error boundaries, 14-fixture corpus verification.

---

## 5. Existing Fixture Corpus
Located in `tests/fixtures/ldocx/` (14 fixtures):
1. `minimal.ldocx` (2,786 bytes) - Single slide, basic text.
2. `text.ldocx` (3,850 bytes) - Headings, multi-column text blocks, typography styles.
3. `image.ldocx` (3,012 bytes) - Filtered and masked image blocks.
4. `table.ldocx` (3,029 bytes) - Data table structure and formatting.
5. `chart.ldocx` (3,055 bytes) - Bar, line, pie, and doughnut chart blocks.
6. `animation.ldocx` (3,090 bytes) - Keyframe and CSS animation properties.
7. `video.ldocx` (3,120 bytes) - Video media embed blocks and controls.
8. `3d.ldocx` (2,972 bytes) - Three.js 3D models with exploded view configurations.
9. `simulation.ldocx` (4,386 bytes) - Reactive STEM simulations (Projectile, Ohm's law, Oscillator, Compound interest).
10. `reactive.ldocx` (4,046 bytes) - Reactive formula variables and dependency DAG.
11. `presentation.ldocx` (3,330 bytes) - Multi-slide presentation with transitions.
12. `large.ldocx` (10,040 bytes) - Stress-testing document with 50+ mixed elements.
13. `malformed.ldocx` (591 bytes) - Corrupted schema payload for error boundary validation.
14. `legacy.ldocx` (459 bytes) - Legacy v1.0 document format for backward compatibility testing.

---

## 6. Known Environmental & Operational Characteristics
- **Server**: HTTP server running on `http://127.0.0.1:3000` (zero external dependencies).
- **Headless Chrome**: Chrome CDP automation on port 9222 / 9558 or direct browser automation via CDP helper.
- **Third-Party CDNs**: Three.js (`three.min.js`) and JSZip (`jszip.min.js`) are bundled locally for offline longevity. Chart.js is loaded dynamically for chart rendering.
- **Security Boundaries**: Pure zero-`eval` safe math AST evaluation in `ldoc-reactive-engine.js`. Scripts and `javascript:` URLs are strictly stripped by `ldoc-validator.js`.
