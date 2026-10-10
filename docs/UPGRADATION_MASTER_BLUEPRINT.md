# LDOC Studio: Upgradation Master Prompt & Design Architecture Blueprint

> **Design Directive**: Elevate LDOC Studio to the highest tier of engineering craftsmanship (Linear, Stripe, Vercel, Framer level).  
> **Brand Identity**: Industrial Precision, Cryptographic Engineering, and Deterministic Living Typography.  
> **Zero Compromise Rule**: Retain 100% of functional logic, WebGL canvases, Pretext layout determinism, Merkle validation, and auth/license gateways while completely replacing flat, generic, or broken UI layers with tactile, responsive, high-fidelity components.

---

## 1. Global Design System & Token Foundation

### 1.1 Color Palette & Token Scale
```css
:root {
  /* Surfaces */
  --bg: #07070B;             /* Obsidian Carbon Void */
  --surface: #0E0E15;        /* Sub-surface Workstation */
  --surface-2: #15151F;      /* Elevated Card & Tool Panel */
  --surface-3: #1C1C2B;      /* Popovers, Tooltips & Modals */
  --border: rgba(255, 255, 255, 0.08);       /* Hairline Titanium */
  --border-focus: rgba(245, 158, 11, 0.45);   /* Active State Glow */

  /* Typography */
  --text: #F4F4F8;           /* Primary Pristine White */
  --text-muted: #9A9AB0;     /* Technical Secondary */
  --text-dim: #64647A;       /* Captions & Metadata */

  /* Functional Accents */
  --accent: #F59E0B;         /* Precision Amber / Merkle Gold */
  --accent-2: #22D3EE;       /* Electric Cyan / WebGL Geometry */
  --accent-3: #8B5CF6;       /* Spatial Violet / Living Ast */
  --accent-success: #10B981; /* Zero-Drift Parity Emerald */
  --accent-danger: #EF4444;  /* Tamper Alert Red */

  /* Geometry & Lighting */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --shadow-card: 0 10px 30px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--border);
  --shadow-glow: 0 0 60px -10px rgba(245, 158, 11, 0.35);

  /* Emil Kowalski Spring Motion Curves */
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration-normal: 280ms;
  --duration-reveal: 700ms;
}
```

### 1.2 Global Ambient Background (Every Route)
- **Layer 1 (Dot Grid)**: Subtle SVG dot pattern (`#ffffff` at 3.5% opacity, 24px pitch).
- **Layer 2 (Drifting Orbs)**: Two blurred radial gradient orbs (Amber at top-left, Electric Cyan at bottom-right) that drift smoothly on a 20s GPU-accelerated cycle.
- **Layer 3 (Noise Grain)**: 3% opacity micro-noise overlay ensuring organic texture without color banding.
- **Dividers**: 1px gradient hairlines (`linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)`).

### 1.3 Floating Island Navbar (Every Route)
- **Position**: Floating pill centered horizontally, `top: 16px`, `z-index: 1000`.
- **Material**: `background: rgba(14, 14, 21, 0.7)`, `backdrop-filter: blur(16px) saturate(180%)`, `border: 1px solid rgba(255, 255, 255, 0.08)`, `border-radius: 9999px`.
- **Interactions**:
  - Shrinks and darkens on scroll (`scrolled` class).
  - Top scroll progress indicator with amber-to-cyan gradient.
  - Active navigation pill highlight with subtle transition.
  - Mobile: Clean hamburger trigger opening full-screen slide-down glass drawer sheet with zero layout blowout.

---

## 2. Section-by-Section Master Prompt: Homepage (`/`)

### Section 2.1 — Monolithic Hero & Vanguard-7 3D Cockpit
- **Eyebrow Pill**: Monospaced status chip `[SPEC 2.5.0 • MERKLE CRYPTOGRAPHIC CONTAINER]` with a pulsing amber LED indicator.
- **Headline**: High-contrast display typography at `clamp(44px, 6.5vw, 84px)`, subtle gradient text from `#FFFFFF` down to `#F59E0B`. Words reveal sequentially with staggered entrance animation.
- **Subcopy**: High-density engineering copy detailing zero-drift typography, air-gapped security, and Draco 3D geometry.
- **Dual Tactile CTAs**:
  - *Primary Button*: Amber glowing border with moving shimmer, `:active { transform: scale(0.985); }`. Links directly to `/live-studio`.
  - *Secondary Button*: Hairline titanium ghost button with micro-border glow. Links to `/docs`.
- **Hero Interactive HUD**:
  - The Vanguard-7 3D engineering asset in a floating browser shell with titanium bezel.
  - 3 floating glass telemetry chips (`340 Nm Torque`, `+42.8°C Core Temp`, `98.4% Frame Parity`) with gentle floating parallax physics.
- **Spec Chip Marquee**: Infinite horizontal marquee below hero displaying core specs (`PRETEXT 0.0.9`, `AIR-GAP CRYPTOGRAPHY`, `MERKLE ROOT TREE`, `DRACO 3D GEOMETRY`, `ZERO RUNTIME DRIFT`, `WASM DETERMINISM`).

### Section 2.2 — Bento Grid: Core Capabilities
- **Layout**: 12-column asymmetric Bento Grid (2x1, 1x1, 1x2 cards).
- **Surface**: Obsidian surface `#0E0E15`, hairline titanium borders.
- **Micro-interactions**: Dynamic spotlight gradient that follows cursor coordinates on hover (`mousemove`).
- **Cards**:
  1. *Card 1 (Span 8)*: Zero-Drift Typography Engine — Live Pretext line-break visualization showing bit-for-bit parity across Editor, Viewer, and PDF Flattener.
  2. *Card 2 (Span 4)*: Merkle Tree Cryptographic Provenance — Live SHA-256 block hash computation with tamper verification badge.
  3. *Card 3 (Span 4)*: Draco 3D Compression & WebGL — Direct rendering of complex geometries with 85% bandwidth reduction.
  4. *Card 4 (Span 4)*: Air-Gapped Zero-Cloud Isolation — Verification badge that all documents unpack and compile 100% offline.
  5. *Card 5 (Span 4)*: Dual-Container Archival Longevity — 20-year fallback guarantee with canonical HTML embedded inside zip archives.

### Section 2.3 — Inside the .ldocx Container (Dual-Pane IDE Inspector)
- **Left Pane (File Tree)**: Clean expandable tree representing `.ldocx` ZIP package (`manifest.json`, `document.json`, `spec.json`, `assets/`, `fallback.html`).
- **Right Pane (AST Inspector)**: JetBrains Mono syntax-highlighted reactive JSON AST with active line indicator.
- **Crossfade Interaction**: Clicking any tree file instantly crossfades the inspector payload and highlights corresponding blocks in the live document mock.

### Section 2.4 — Cryptographic Trust & Provenance Layer
- **Layout**: 3x2 technical spec cards with monospaced `SPEC-01` through `SPEC-06` tags.
- **Styling**: Amber hairline borders that illuminate on hover with subtle radial backdrop blur.
- **Details**: Full cryptographic specs explaining Merkle proofs, immutable revision trees, and digital signatures.

### Section 2.5 — Interactive 4-Step Pipeline
- **Layout**: Horizontal timeline / stepper with animated glowing connector line.
- **Steps**:
  1. *01 Ingest*: Import Markdown, LaTeX, or 3D GLTF models into AST.
  2. *02 Deterministic Layout*: Pretext 0.0.9 computes exact glyph bounding boxes.
  3. *03 Merkle Seal*: Cryptographic hashing of every block into an immutable tree.
  4. *04 Universal Export*: Bit-for-bit identical distribution across Web, Desktop, and PDF.
- **Counters**: Animated stat counters (`0%` to `100%`) when scrolled into view.

### Section 2.6 — Conformance & Feature Comparison Matrix
- **Header**: Sticky technical header comparing `.ldocx` against PDF 2.0, Microsoft Word (.docx), and Notion.
- **Visuals**: Distinct amber highlighted column for LDOC Studio with subtle border glow.
- **Rows**: 10 rigorous technical metrics (Deterministic Line Parity, Native 3D WebGL, Offline Air-Gap, Merkle Tamper-Proofing, Zero Vendor Lock-in, Scriptable AST).
- **Icons**: Hairline SVG checkmarks and subtle cross indicators.

### Section 2.7 — Interactive Showcase & Template Gallery
- **Layout**: Dynamic card deck featuring real-world industrial templates (Vanguard-7 Technical Spec, Aerospace Pre-flight Briefing, Daily Prophet Dynamic Newspaper, GTA VI Vice City Engine Architecture).
- **Interactions**: 3D perspective card tilt on hover (`rotateX`, `rotateY`), instant "Launch in Studio" preview trigger.

### Section 2.8 — Single Source of Truth Pricing Console
- **Tiers**:
  - **Community ($0)**: 100% free open-source reader, offline fallback viewer, local file inspection.
  - **Studio Pro ($19 Lifetime)**: Highlighted card with rotating conic-gradient border (`ldocRotateConic`), direct Lemon Squeezy checkout link (`https://jay-app.lemonsqueezy.com/checkout/buy/16851c1c-6dfb-4607-bf8b-81c3427594d1`), lifetime updates, offline desktop app.
  - **Cloud Workspace ($79/year)**: Team collaboration, shared asset registries, multi-seat sync.
  - **Enterprise ($499/year)**: Custom cryptographic key management, air-gapped on-premise flattener, SLA.
- **Strict Guard**: Remove all references to conflicting legacy prices ($29/mo, $99/mo).

### Section 2.9 — Technical FAQ Accordion
- **Search & Chips**: Category filter chips (Architecture, Licensing, Security, Offline).
- **Accordion Physics**: Smooth Emil Kowalski spring height reveal with plus-to-cross icon rotation.

### Section 2.10 — Downloads Console & Final Call-To-Action
- **Auto OS Detection**: Detects user OS (Windows, macOS Apple Silicon/Intel, Linux AppImage/deb) and highlights the corresponding download card with an amber accent ring.
- **Final Banner**: Full-width gradient surface with ambient particles, high-contrast headline, and instant workstation launcher.

---

## 3. Page-by-Page Master Prompts

### Page 3.1 — `/features` (Architectural Deep-Dive)
- **Concept**: Sticky-scroll technical narrative.
- **Left Column**: Pinned technical story detailing Pretext typography, Draco 3D WebGL, and Merkle security.
- **Right Column**: Live interactive visualizers that update in sync:
  - Vanguard-7 interactive Three.js torque slider with real-time HUD telemetry.
  - Merkle tree tamper simulation demonstrating instant detection of single-bit corruption.
- **Layout Invariant**: Strictly zero horizontal scroll (`hasHScroll: false` on 390px).

### Page 3.2 — `/format` (Technical Specification Hub)
- **Concept**: Industrial developer documentation and RFC spec.
- **Layout**: 3-column structured spec sheet (Navigation Tree | RFC Body | Live Interactive JSON Playground).
- **ZIP Unpacker Mock**: Visual diagram showing byte layout of an `.ldocx` archive.
- **Code Highlighting**: Pure technical monospace formatting with one-click copy and tactile feedback.

### Page 3.3 — `/live-studio` & `/creator` (Professional IDE Shell)
- **Concept**: Linear/Figma-grade document workstation.
- **Chrome**: Obsidian Carbon framing with hairline titanium borders.
- **Iconography**: 100% crisp monochrome Lucide SVG icons (no cartoon emojis).
- **Panels**:
  - Left: Document pages & outline panel with live miniature thumbnails.
  - Center: Dotted infinite canvas with zoom/pan controls.
  - Right: Tabbed inspector (Design / Typography / 3D & WebGL / Reactive AST).
- **Micro-features**: `Ctrl+K` Command Palette, keyboard shortcut tooltips, visual theme swatch picker (Paper, Glass, Cyber, Velvet, Nebula, Zen, Aquatic, Prism).

### Page 3.4 — `/models` (3D Asset Marketplace)
- **Concept**: High-precision 3D geometry catalogue.
- **Components**: Category filter sidebar, polygon/Draco compression ratio badges, real-time WebGL thumbnail previews, and instant `.ldocx` embed generator.

### Page 3.5 — `/pricing` (Dedicated Commercial Hub)
- **Concept**: Frictionless, transparent commercial station.
- **Layout**: 4-column responsive grid collapsing gracefully to single column on mobile.
- **Studio Pro Focus**: Rotating conic-gradient border, verified Lemon Squeezy checkout link, 30-day money-back guarantee seal.
- **Mobile Guard**: Modals set to `max-width: min(94vw, 720px)` to prevent viewport blowout.

### Page 3.6 — `/docs` (Developer Documentation Hub)
- **Concept**: Stripe-grade API & SDK reference.
- **Layout**: Responsive 3-pane documentation layout with sticky Table of Contents.
- **Components**: `@ldoc/sdk` installation snippets, AST schema references, headless CLI flattener documentation.
- **Copy Feedback**: Replaced disruptive `alert()` modals with elegant inline tactile "Copied!" toasts.

### Page 3.7 — `/changelog` (Engineering Release Log)
- **Concept**: High-contrast chronological release ledger.
- **Layout**: Vertical timeline with glowing line markers, release tags (`v2.5.0`, `v2.4.2`, `v2.0.0`), commit hashes, and detailed spec migration diffs.

### Page 3.8 — `/security` (Cryptographic & Air-Gap Verification)
- **Concept**: Cryptographic trust console.
- **Components**: Interactive Merkle Root calculator, SHA-256 live payload hasher, air-gap offline compliance matrix, and security whitepaper downloads.

### Page 3.9 — Legal Suite (`/privacy`, `/terms`, `/refund`, `/license`)
- **Concept**: Editorial precision typography.
- **Typography**: Clean hierarchy with high contrast, sticky section TOC, and clear ownership guarantees (user retains 100% ownership of `.ldocx` files).

---

## 4. Verification Protocol & Quality Gates
Every page upgrade MUST strictly satisfy:
1. **Zero Text Drift**: Bit-for-bit identical layout verified via `tests/test_section2_cross_surface.js`.
2. **Encapsulation**: 0 `@chenglou/pretext` violations verified via `tests/test_section8_arch.js`.
3. **Mobile Responsiveness**: `hasHScroll: false`, `bodyWidth: 390px` on mobile viewports.
4. **Console Hygiene**: 0 runtime console errors or 404 missing assets.
5. **Aesthetic Conformance**: 0 cartoon emojis in navigation/headers; strict adherence to Industrial Precision palette.
