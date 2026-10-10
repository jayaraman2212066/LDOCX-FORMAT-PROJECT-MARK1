const fs = require('fs');
const path = require('path');

const directBuyUrl = 'https://jay-app.lemonsqueezy.com/checkout/buy/16851c1c-6dfb-4607-bf8b-81c3427594d1';

const formatHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Living Document Format (.ldocx) Specification — LDOC Studio</title>
  <meta name="description" content="Explore the open Living Document Format (.ldocx) specification. Dual-container v3.0, WebGL 3D blocks, reactive AST, and cryptographic verification.">
  <link rel="icon" type="image/png" href="/ldoc_logo.png">
  <link rel="shortcut icon" href="/app.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/design-system.css">
  <script defer src="/design-system.js"></script>
  <style>
    /* ── Format Page Specification Workspace Styling ── */
    .hero-container {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 140px 24px 60px;
      text-align: center;
      position: relative;
      z-index: 10;
    }

    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: var(--radius-full);
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.28);
      font-size: 12px;
      font-weight: 700;
      color: #38BDF8;
      margin-bottom: 24px;
      letter-spacing: 0.5px;
    }

    .hero-h1 {
      font-family: var(--font-display);
      font-size: clamp(38px, 6vw, 76px);
      font-weight: 800;
      line-height: 1.08;
      letter-spacing: -0.03em;
      margin-bottom: 24px;
      max-width: 960px;
      margin-left: auto;
      margin-right: auto;
      background: linear-gradient(180deg, #FFFFFF 30%, rgba(255, 255, 255, 0.7) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-h1 span.cyan-gradient {
      background: linear-gradient(135deg, #38BDF8, #818CF8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-lead {
      font-size: clamp(16px, 1.8vw, 20px);
      line-height: 1.6;
      color: var(--muted);
      max-width: 760px;
      margin: 0 auto 40px;
    }

    .hero-ctas {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 48px;
      flex-wrap: wrap;
      justify-content: center;
    }

    /* 3-Column Spec Workspace */
    .spec-workspace-wrap {
      max-width: 1400px;
      margin: 0 auto 120px;
      padding: 0 24px;
      width: 100%;
      box-sizing: border-box;
    }
    @media (max-width: 640px) {
      .spec-workspace-wrap {
        padding: 0 16px;
      }
    }

    .spec-workspace-grid {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr) 440px;
      gap: 32px;
      align-items: start;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    .spec-workspace-grid > * {
      min-width: 0;
      max-width: 100%;
    }
    @media (max-width: 1150px) {
      .spec-workspace-grid { grid-template-columns: minmax(0, 1fr); }
    }

    /* Column 1: TOC */
    .spec-toc-card {
      position: sticky;
      top: 90px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 20px 16px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }
    @media (max-width: 1150px) {
      .spec-toc-card { position: static; }
    }
    .spec-toc-header {
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--accent);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 14px;
      padding-left: 8px;
    }
    .spec-nav-link {
      display: block;
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      color: var(--muted);
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s var(--ease-spring);
    }
    .spec-nav-link:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.05);
    }
    .spec-nav-link.active {
      color: var(--accent);
      background: rgba(245, 158, 11, 0.12);
      font-weight: 700;
      border-left: 2px solid var(--accent);
    }

    /* Column 2: Article */
    .spec-article {
      color: #CBD5E1;
      line-height: 1.7;
      font-size: 14.5px;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .spec-section-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 32px;
      margin-bottom: 36px;
      scroll-margin-top: 100px;
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
      overflow-wrap: break-word;
    }
    @media (max-width: 640px) {
      .spec-section-card { padding: 20px 16px; }
    }
    .spec-tag-badge {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: #38BDF8;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 12px;
    }
    .spec-sec-h2 {
      font-family: var(--font-display);
      font-size: 26px;
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 14px;
      letter-spacing: -0.02em;
    }
    .spec-table-container {
      overflow-x: auto;
      margin: 20px 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
    }
    .spec-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .spec-table th, .spec-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    .spec-table th {
      color: var(--accent);
      font-family: var(--font-mono);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: rgba(255, 255, 255, 0.02);
    }

    /* Column 3: Live Inspector */
    .spec-inspector-card {
      position: sticky;
      top: 90px;
      background: #060911;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      min-width: 0;
    }
    @media (max-width: 1150px) {
      .spec-inspector-card { position: static; }
    }
    .inspector-titlebar {
      background: rgba(18, 22, 34, 0.95);
      border-bottom: 1px solid var(--border);
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      max-width: 100%;
      overflow: hidden;
      box-sizing: border-box;
    }
    .spec-code-tab {
      background: transparent;
      border: none;
      color: var(--muted);
      font-family: var(--font-mono);
      font-size: 11.5px;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .spec-code-tab:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.06);
    }
    .spec-code-tab.active {
      color: #38BDF8;
      background: rgba(56, 189, 248, 0.15);
      font-weight: 700;
    }
    .code-viewer-body {
      padding: 18px;
      max-height: calc(85vh - 120px);
      overflow-y: auto;
      font-family: var(--font-mono);
      font-size: 12.5px;
      color: #93C5FD;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-all;
    }
  </style>
</head>
<body>

  <!-- Floating Pill Navbar -->
  <div class="ldoc-nav-wrapper">
    <nav class="ldoc-pill-navbar" aria-label="Main Navigation">
      <a href="/" class="ldoc-nav-logo">
        <img src="/ldoc_logo.png" alt="LDOC Studio Logo">
        <span>LDOC Studio</span>
      </a>

      <div class="ldoc-nav-links">
        <a href="/format" class="ldoc-nav-link active">Format</a>
        <a href="/features" class="ldoc-nav-link">Features</a>
        <a href="/live-studio" class="ldoc-nav-link">Live Studio</a>
        <a href="/models" class="ldoc-nav-link">Models Hub</a>
        <a href="/pricing" class="ldoc-nav-link">Pricing</a>
        <a href="/docs" class="ldoc-nav-link">Docs</a>
        <a href="/changelog" class="ldoc-nav-link">Changelog</a>
      </div>

      <div class="ldoc-nav-actions">
        <a href="/live-studio" class="ldoc-btn-ghost">Launch Studio</a>
        <a href="${directBuyUrl}" target="_blank" class="ldoc-btn-primary">Get Pro</a>
      </div>
    </nav>
  </div>

  <!-- Hero Section -->
  <header class="hero-container">
    <div class="hero-eyebrow ldoc-reveal">
      <span>SPECIFICATION • v2.5.0 ARCHITECTURE</span>
    </div>

    <h1 class="hero-h1 ldoc-reveal" data-delay="100ms">
      The Open Standard for <span class="cyan-gradient">Reactive Living Documents.</span>
    </h1>

    <p class="hero-lead ldoc-reveal" data-delay="200ms">
      An open, tamper-evident container standard uniting JSON Abstract Syntax Trees, hardware-accelerated spatial 3D WebGL, sandboxed JavaScript runtimes, and Merkle DAG cryptographic signatures.
    </p>

    <div class="hero-ctas ldoc-reveal" data-delay="300ms">
      <a href="/live-studio" class="ldoc-btn-primary" style="padding: 12px 28px; font-size: 15px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Launch Studio IDE</span>
      </a>
      <a href="/LDOCX_TECHNICAL_SPECIFICATION.pdf" target="_blank" class="ldoc-btn-secondary" style="padding: 12px 24px; font-size: 15px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>Download Spec PDF (16 Pages)</span>
      </a>
    </div>
  </header>

  <!-- 3-Column Specification Workspace -->
  <main class="spec-workspace-wrap">
    <div class="spec-workspace-grid">

      <!-- Column 1: In-Page Section ScrollSpy TOC -->
      <aside class="spec-toc-card ldoc-reveal">
        <div class="spec-toc-header">SPEC NAVIGATION</div>
        <nav id="spec-toc-nav" style="display: flex; flex-direction: column; gap: 4px;">
          <a href="#sec-container" class="spec-nav-link active">1. The .ldocx Container</a>
          <a href="#sec-ast" class="spec-nav-link">2. AST Schema &amp; Nodes</a>
          <a href="#sec-draco" class="spec-nav-link">3. Draco 3D Pipeline</a>
          <a href="#sec-merkle" class="spec-nav-link">4. Merkle Tree &amp; Signatures</a>
          <a href="#sec-flattener" class="spec-nav-link">5. Export Flattener Parity</a>
        </nav>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);">
          <a href="/LDOCX_TECHNICAL_SPECIFICATION.pdf" target="_blank" class="ldoc-btn-ghost" style="width: 100%; justify-content: center; font-size: 12px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download Spec PDF</span>
          </a>
        </div>
      </aside>

      <!-- Column 2: Specification Article Body -->
      <article class="spec-article">

        <!-- 1. The .ldocx Container -->
        <section id="sec-container" class="spec-section-card ldoc-reveal">
          <span class="spec-tag-badge">SPEC-01 • CONTAINER ARCHITECTURE</span>
          <h2 class="spec-sec-h2">1. The .ldocx Dual-Container</h2>
          <p style="margin-bottom: 16px;">
            An <strong>.ldocx</strong> file is a standard deterministic ZIP archive holding machine-evaluable AST descriptors, compressed spatial CAD meshes, and cryptographic provenance trees. It implements dual-container backward compatibility for seamless migration across 20-year archival lifespans.
          </p>

          <div class="spec-table-container">
            <table class="spec-table">
              <thead>
                <tr>
                  <th>Component File</th>
                  <th>Standard Level</th>
                  <th>Purpose &amp; Lifecycle</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>manifest.json</code></td>
                  <td>Canonical v3.0</td>
                  <td>Document metadata, engine targets, hardware attributes, and root hashes.</td>
                </tr>
                <tr>
                  <td><code>document.json</code></td>
                  <td>Canonical v3.0</td>
                  <td>The modern semantic AST node hierarchy and reactive formula graph.</td>
                </tr>
                <tr>
                  <td><code>spec.json</code></td>
                  <td>Legacy v2.0/v2.5</td>
                  <td>Maintained for backward-compatible rendering in earlier studio versions.</td>
                </tr>
                <tr>
                  <td><code>fallback.html</code></td>
                  <td>Archival 20-Yr</td>
                  <td>Self-contained, zero-dependency offline web presentation for universal access.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- 2. Deterministic AST & Reactive DAG -->
        <section id="sec-ast" class="spec-section-card ldoc-reveal">
          <span class="spec-tag-badge">SPEC-02 • SEMANTIC AST</span>
          <h2 class="spec-sec-h2">2. Deterministic AST &amp; Reactive DAG</h2>
          <p style="margin-bottom: 16px;">
            Document nodes represent discrete semantic blocks. Reactive blocks establish explicit input dependencies, evaluated as a Directed Acyclic Graph (DAG) with topological sorting. This mathematical model guarantees zero circular dependency locks and eliminates visual glitch flickers.
          </p>

          <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 16px;">
            <div style="font-family: var(--font-mono); font-size: 11px; color: #38BDF8; font-weight: 700; margin-bottom: 6px;">REACTIVE FORMULA EVALUATION ENGINE</div>
            <div style="font-size: 13px; color: #CBD5E1; font-family: var(--font-mono);">
              DAG: $slider.torque (340 Nm) ──▶ f(t) = t * 0.126 ──▶ #thermal-val (+42.8 °C)
            </div>
          </div>

          <p style="font-size: 13.5px; color: var(--muted);">
            All text measurement and line-breaking algorithms are executed mathematically through <code>LdocTextLayout</code> without DOM geometry reads, preventing forced layout thrashing across presentation slides.
          </p>
        </section>

        <!-- 3. Draco 3D Geometry Pipeline -->
        <section id="sec-draco" class="spec-section-card ldoc-reveal">
          <span class="spec-tag-badge">SPEC-03 • SPATIAL 3D MESH</span>
          <h2 class="spec-sec-h2">3. Draco 3D Geometry Pipeline</h2>
          <p style="margin-bottom: 16px;">
            Spatial 3D blocks embed Google Draco compressed geometry buffers directly within the <code>assets/meshes/</code> container partition. Heavy mechanical CAD assemblies and robotics kinematics achieve up to 92% compression ratio while retaining discrete 60 FPS client rendering.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: var(--radius-sm); padding: 16px;">
              <div style="font-size: 11px; font-family: var(--font-mono); color: #38BDF8; font-weight: 700;">UNCOMPRESSED CAD</div>
              <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; font-family: var(--font-mono); margin-top: 4px;">4.8 MB</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">Raw STEP / STL triangles</div>
            </div>
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-sm); padding: 16px;">
              <div style="font-size: 11px; font-family: var(--font-mono); color: #34D399; font-weight: 700;">DRACO COMPRESSED</div>
              <div style="font-size: 20px; font-weight: 800; color: #34D399; font-family: var(--font-mono); margin-top: 4px;">64 KB (-92%)</div>
              <div style="font-size: 11px; color: var(--muted); margin-top: 2px;">Sub-millisecond edge decode</div>
            </div>
          </div>
        </section>

        <!-- 4. Merkle Tree & Signatures -->
        <section id="sec-merkle" class="spec-section-card ldoc-reveal">
          <span class="spec-tag-badge">SPEC-04 • CRYPTOGRAPHIC PROVENANCE</span>
          <h2 class="spec-sec-h2">4. Merkle Tree &amp; Signatures</h2>
          <p style="margin-bottom: 16px;">
            Every constituent block in the document is hashed into an Ed25519-signed Merkle Tree (<code>merkle.proof</code>). Authors sign the root hash digest using their hardware cryptographic key. Readers independently verify bit-level integrity with zero third-party notary roundtrips.
          </p>

          <div style="background: rgba(15, 23, 42, 0.75); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; font-family: var(--font-mono); font-size: 12px;">
            <div style="color: var(--muted); margin-bottom: 4px;">Verified Root Digest:</div>
            <div style="color: #34D399; word-break: break-all;">9e898a2f4c01db189e3a67d0284e9124bb182f0c78a1a9e5b6d9124018274acb</div>
            <div style="margin-top: 8px; color: #CBD5E1; font-size: 11px;">Algorithm: <strong>SHA-256 + Ed25519 Signature</strong></div>
          </div>
        </section>

        <!-- 5. Export Flattener Parity -->
        <section id="sec-flattener" class="spec-section-card ldoc-reveal">
          <span class="spec-tag-badge">SPEC-05 • ARCHITECTURAL INVARIANT</span>
          <h2 class="spec-sec-h2">5. Export Flattener Parity</h2>
          <p style="margin-bottom: 16px;">
            The foundational invariant of the LDOC living document architecture is <strong>Zero Text Drift Across Surfaces</strong>. The interactive Editor, the Viewer, and the headless PDF flattener evaluate line-breaks, line counts, and bounding heights using the identical mathematical model.
          </p>

          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 16px; font-size: 12px; color: #34D399; font-family: var(--font-mono);">
            ● CONFORMANCE TEST STATUS: 25/25 PARITY CHECKS BIT-FOR-BIT IDENTICAL (0px DRIFT)
          </div>
        </section>

      </article>

      <!-- Column 3: Sticky Code Inspector Panel -->
      <aside class="spec-inspector-card ldoc-reveal">
        <div class="inspector-titlebar">
          <div style="display: flex; gap: 4px; overflow-x: auto;" id="spec-code-tabs">
            <button class="spec-code-tab active" onclick="switchSpecCodeTab('manifest', this)">manifest.json</button>
            <button class="spec-code-tab" onclick="switchSpecCodeTab('document', this)">document.json</button>
            <button class="spec-code-tab" onclick="switchSpecCodeTab('ast_node', this)">AST Node</button>
            <button class="spec-code-tab" onclick="switchSpecCodeTab('zip_tree', this)">ZIP Tree</button>
          </div>
          <button class="ldoc-btn-ghost" id="btn-copy-code-panel" onclick="copyCurrentSpecCode()" title="Copy Code" style="padding: 4px 10px; font-size: 11px; border: 1px solid var(--border);">
            Copy
          </button>
        </div>
        <pre class="code-viewer-body" id="spec-code-content"></pre>
      </aside>

    </div>
  </main>

  <!-- Reusable Multi-Column Footer -->
  <footer class="ldoc-footer" style="background: var(--surface); border-top: 1px solid var(--border); padding: 80px 24px 40px;">
    <div style="max-width: var(--max-width); margin: 0 auto; display: grid; grid-template-columns: 2fr repeat(4, 1fr); gap: 40px; margin-bottom: 60px;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <img src="/ldoc_logo.png" alt="LDOC Studio" style="width: 28px; height: 28px; border-radius: 6px;">
          <span style="font-family: var(--font-display); font-weight: 800; font-size: 18px; color: #FFFFFF;">LDOC Studio</span>
        </div>
        <p style="font-size: 13.5px; color: var(--muted); line-height: 1.6; max-width: 320px; margin-bottom: 20px;">
          The open living document specification designed for long-term cryptographic stability.
        </p>
      </div>

      <div>
        <h4 style="font-family: var(--font-display); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #FFFFFF; margin-bottom: 16px;">Product</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
          <a href="/features" style="color: var(--muted); text-decoration: none;">Features</a>
          <a href="/live-studio" style="color: var(--muted); text-decoration: none;">Live Studio</a>
          <a href="/models" style="color: var(--muted); text-decoration: none;">Models Hub</a>
          <a href="/pricing" style="color: var(--muted); text-decoration: none;">Pricing</a>
        </div>
      </div>

      <div>
        <h4 style="font-family: var(--font-display); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #FFFFFF; margin-bottom: 16px;">Standard</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
          <a href="/format" style="color: var(--muted); text-decoration: none;">.ldocx Format Spec</a>
          <a href="/docs" style="color: var(--muted); text-decoration: none;">Developer SDK</a>
          <a href="/security" style="color: var(--muted); text-decoration: none;">Security &amp; Air-Gap</a>
        </div>
      </div>

      <div>
        <h4 style="font-family: var(--font-display); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #FFFFFF; margin-bottom: 16px;">Downloads</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
          <a href="/pricing" style="color: var(--muted); text-decoration: none;">Windows (.exe)</a>
          <a href="/pricing" style="color: var(--muted); text-decoration: none;">macOS (.dmg)</a>
          <a href="/pricing" style="color: var(--muted); text-decoration: none;">Linux (.tar.gz)</a>
        </div>
      </div>

      <div>
        <h4 style="font-family: var(--font-display); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #FFFFFF; margin-bottom: 16px;">Legal</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
          <a href="/privacy" style="color: var(--muted); text-decoration: none;">Privacy Policy</a>
          <a href="/terms" style="color: var(--muted); text-decoration: none;">Terms of Service</a>
          <a href="/license" style="color: var(--muted); text-decoration: none;">License Agreement</a>
        </div>
      </div>
    </div>

    <div style="max-width: var(--max-width); margin: 0 auto; border-top: 1px solid var(--border); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: var(--dim); flex-wrap: wrap; gap: 16px;">
      <div>&copy; 2026 J AI ENTERPRISES. All rights reserved. .ldocx specification is licensed under Apache-2.0.</div>
    </div>
  </footer>

  <!-- ── Interactive Spec Scripts ── -->
  <script>
    const specCodeSnippets = {
      manifest: JSON.stringify({
        "schema_version": "3.0.0",
        "archive_format": "ldocx_dual_container",
        "document_id": "doc_eb41d8e7",
        "created_at": "2026-10-10T12:00:00Z",
        "entry_point": "content/document.json",
        "fallback_entry": "content/fallback.html",
        "merkle_root": "9e898a2f4c01db189e3a67d0284e9124bb182f0c78a1a9e5b6d9124018274acb",
        "hardware_requirements": {
          "webgl": true,
          "offscreen_canvas": true,
          "discrete_gpu_recommended": false
        }
      }, null, 2),

      document: JSON.stringify({
        "version": "3.0.0",
        "blocks": [
          {
            "id": "blk_01_hero",
            "type": "heading",
            "level": 1,
            "content": "Vanguard-7 Autonomous Actuator Specification"
          },
          {
            "id": "blk_02_kinematics",
            "type": "spatial_3d",
            "source": "assets/meshes/quadruped.draco",
            "fps_target": 60
          }
        ]
      }, null, 2),

      ast_node: JSON.stringify({
        "id": "blk_reactive_formula_02",
        "type": "reactive_formula",
        "expression": "calc_dynamic_load(slider.val)",
        "dependencies": ["$slider.torque"],
        "output_target": "#thermal-margin-display",
        "execution_engine": "topological_dag",
        "precision": "float64"
      }, null, 2),

      zip_tree: \`vanguard_report.ldocx
├── META-INF/
│   ├── manifest.json       (Container metadata & schema)
│   └── signatures.json     (Ed25519 cryptographic seals)
├── content/
│   ├── document.json       (Canonical v3.0 document AST)
│   ├── spec.json           (Legacy v2.0 backward-compat)
│   └── fallback.html       (Zero-dependency 20-yr archive)
├── assets/
│   ├── meshes/             (Google Draco compressed CAD)
│   └── shaders/            (Volumetric WebGL GLSL shaders)
└── merkle.proof            (SHA-256 cascade integrity tree)\`
    };

    let currentSpecCodeTab = 'manifest';

    window.switchSpecCodeTab = function(tab, btn) {
      currentSpecCodeTab = tab;
      document.querySelectorAll('.spec-code-tab').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      const codeEl = document.getElementById('spec-code-content');
      if (codeEl) {
        codeEl.textContent = specCodeSnippets[tab] || '';
      }
    };

    window.copyCurrentSpecCode = function() {
      const code = specCodeSnippets[currentSpecCodeTab] || '';
      navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('btn-copy-code-panel');
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          btn.style.color = '#34D399';
          setTimeout(() => {
            btn.textContent = orig;
            btn.style.color = '';
          }, 1800);
        }
      });
    };

    // ScrollSpy for TOC links
    document.addEventListener('DOMContentLoaded', () => {
      switchSpecCodeTab('manifest');

      const sections = document.querySelectorAll('article.spec-article section');
      const navLinks = document.querySelectorAll('#spec-toc-nav .spec-nav-link');
      if (!sections.length || !navLinks.length) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach(link => {
              if (link.getAttribute('href') === '#' + id) {
                link.classList.add('active');
              } else {
                link.classList.remove('active');
              }
            });
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });

      sections.forEach(sec => observer.observe(sec));
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '..', 'format.html'), formatHtml, 'utf8');
console.log('Successfully rebuilt format.html with premium design system!');
