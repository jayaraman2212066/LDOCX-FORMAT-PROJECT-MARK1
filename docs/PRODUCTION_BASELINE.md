# LDOCX Living Document Platform — Production Baseline Snapshot
**Baseline Version**: `v3.0.0` (Living Document Enterprise Standard)  
**Deployment Target**: `https://ldoc-studios.vercel.app`  
**Repository**: `https://github.com/jayaraman2212066/LDOCX-FORMAT-PROJECT-MARK1`  
**Baseline Date**: September 2026  
**Document Classification**: Protected Production System Specification

---

## 1. Executive Summary & Architecture Baseline
LDOCX is an established, production-deployed living document format and runtime system designed to replace static PDFs, monolithic slide decks, and proprietary design formats. The platform combines:
1. **Pretext Zero-Drift Typography Engine**: Deterministic arithmetic line-breaking and spatial layout pinned to `@chenglou/pretext@0.0.9`. 100% bit-for-bit identical layout across Viewer, Studio Editor, and PDF Export flattener with zero forced DOM reflows (`getBoundingClientRect`, `offsetHeight`).
2. **Canva Pro / Business Precision Creative Suite**: 11 vector geometric primitives with SVG gradients, drop-shadow filters, corner radiuses, and labels; non-destructive image card filters (brightness, contrast, saturation, blur, grayscale, flip, clipping masks); brand design tokens; and WCAG 2.2 AA/AAA contrast ratio validation.
3. **Living Document Runtime**: Safe recursive-descent math AST evaluator and topological reactive dependency DAG (**zero `eval()` / `new Function()`**); simulation presets (projectile motion, Ohm's law, harmonic oscillator, compound interest); Three.js 3D spatial models with parametric exploded views, scene graph inspection, and screen-projected annotation pins; and interactive self-grading quizzes.
4. **Dual-Container Storage & Longevity Architecture**: Open zip container packaging canonical `document.json`, legacy `spec.json`, `manifest.json`, local media assets, an embedded 20-year archival `fallback.html`, and RFC 6962 SHA-256 cryptographic Merkle tree integrity verification.

---

## 2. Production Routes & Web Endpoints

Configured in [`vercel.json`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/vercel.json) and mirrored in static build output `public/` and `app/viewer/`:

| Route URL | Target File | Purpose |
| :--- | :--- | :--- |
| `/` | `index.html` | Marketing website, interactive feature playground, and showcase |
| `/viewer` | `viewer.html` | Client-side living document viewer with Presentation Modes (Paper, Glass, Deck, Gazette) |
| `/studio` | `studio.html` | Full-screen interactive living document studio and block authoring workstation |
| `/creator` | `creator.html` | Visual Canva-style canvas creator with drag-and-drop spatial element positioning |
| `/live-studio` | `live-studio.html` | Real-time dual-pane editor and live interactive document compiler |
| `/privacy` | `privacy.html` | Enterprise privacy policy & GDPR compliance notice |
| `/terms` | `terms.html` | Enterprise software license and terms of service |
| `/security` | `security.html` | Cryptographic Merkle provenance and sandbox security documentation |
| `/refund` | `refund.html` | Customer refund & commercial licensing terms |
| `/license` | `license.html` | Open-source Apache-2.0 and Pro commercial license specs |
| `/api/(.*)` | `api/index.js` | Serverless backend API router for payments and cloud vault persistence |

---

## 3. Core Engine Modules & Dependencies

### Core Modules (`src/` $\rightarrow$ Root & Packages)
- [`ldoc-text-layout.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-text-layout.js): Pretext typography layout, exclusion carving, multi-line auto-grow, and column balancing. Pinned strictly to `@chenglou/pretext@0.0.9`.
- [`ldoc-shape-engine.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-shape-engine.js): 11 vector shape primitives, SVG gradient and drop shadow filter generation.
- [`ldoc-reactive-engine.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-reactive-engine.js): Safe topological reactive dependency DAG, math formula evaluator, and simulation presets.
- [`ldoc-3d-inspector.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-3d-inspector.js): Three.js parametric exploded view controller, scene tree hierarchy, part isolation, and 3D annotation pins.
- [`ldoc-quiz-engine.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-quiz-engine.js): Diagnostic quizzes, auto-grading, hints, and explanations.
- [`ldoc-parser.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-parser.js): Multi-version `.ldocx` package parser, client-side compiler, RFC 6962 Merkle tree calculator, and archival fallback generator.
- [`ldoc-editor-core.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-editor-core.js): Selection, transform, alignment, distribution, z-order, clipboard, brand tokens, WCAG contrast analyzer, and layer reconstruction.
- [`ldoc-export-engine.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-export-engine.js): Multi-format document exporter (HTML, Markdown, PDF, JSON).
- [`ldoc-shared-modals.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-shared-modals.js): Modal dialogs for Cloud Vault, Version History, Sharing, and Analytics.
- [`ldoc-toast.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-toast.js): Accessible notifications and UI toasts.
- [`ldoc-config.js`](file:///d:/LDOCX/LDOCX-FORMAT-PROJECT-MARK1/src/ldoc-config.js): Runtime environment configuration.

### Third-Party Dependencies (`package.json`)
- `@chenglou/pretext`: `"0.0.9"` (strictly pinned, zero other dependencies in package.json).
- External CDN / Vendor Libraries (with complete offline fallbacks):
  - `jszip.min.js`: Local offline archive compressor/decompressor.
  - `three.min.js`: Three.js 3D WebGL runtime.

---

## 4. Build & Test Baseline Status

### Build Scripts
- `npm run build`: Executes `build.js` $\rightarrow$ compiles `ldoc-text-layout.js` with esbuild, mirrors modules from `src/` to all packages, executes `build_static.js`, and packages release distributions (`.zip`, `.dmg`, `.AppImage`, `.apk`, `.exe`).
- `npm test`: Executes `packages/ldoc-sdk/test.js` and all master test suites in `tests/run_all_pretext_master_tests.js`.

### Test Suite Status (13/13 Passed 100%)
- **Section 1**: Core Module Unit Tests (`LdocTextLayout`) — **PASS**
- **Section 2**: Cross-Surface Consistency (Zero Drift Parity) — **PASS**
- **Section 3**: Runtime & Mount Performance Audit (Zero Forced Reflows) — **PASS**
- **Section 4**: Editor-Specific Tests (Auto-Grow, Centering, 3D) — **PASS**
- **Section 5 & 6**: Viewer & PDF Visual Verification — **PASS**
- **Section 7**: Cross-Platform & Cross-Browser Tests — **PASS**
- **Section 8**: Architecture Conformance (`@chenglou/pretext` pinning & encapsulation) — **PASS**
- **Section 9**: Regression Sweep (B1–B9) — **PASS**
- **Section 10**: Pretext UI/UX 8 Master Features — **PASS**
- **Section 11**: Multi-User Concurrency & Integrity Audit — **PASS**
- **Section 12**: Canva Pro Creative Engine & Vector Shapes — **PASS**
- **Section 13**: Living Document Runtime (Reactive DAG, 3D & Quiz) — **PASS**

---

## 5. Security & Isolation Model
1. **Zero Execution of Unsafe Dynamic Code**:
   - `eval()`, `new Function()`, and arbitrary dynamic scripts are strictly prohibited in the document runtime. All mathematical formulas evaluate via an isolated recursive-descent parser.
2. **Capability Sandbox**:
   - Embedded interactive objects render in sandboxed iframes or isolated shadow elements with strict CSP (`connect-src 'none'`, `script-src 'unsafe-inline'`, `img-src data: blob:`).
3. **Cryptographic Integrity**:
   - Every block in a `.ldocx` package is verified against RFC 6962 SHA-256 Merkle tree leaves. Any tampering with block content, properties, or styling invalidates the cryptographic root and localizes the tampered block ID.

---

## 6. Known Baseline Warnings & Invariants
- **Smoke Check Network Grace**: In restricted network environments or specific firewall configurations, remote Vercel edge headers may return through proxies without `X-Content-Type-Options: nosniff`. Local and standard HTTP responses verify this header properly.
- **Strict Backward Compatibility**: v1 legacy containers (`spec.json`), v2 containers, and v3 dual-containers (`manifest.json` + `document.json`) must all open, render, and save cleanly without data loss.
