const fs = require('fs');
const path = require('path');

const directBuyUrl = 'https://jay-app.lemonsqueezy.com/checkout/buy/16851c1c-6dfb-4607-bf8b-81c3427594d1';

const featuresHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LDOC Studio Features — Documents Engineered as Living Software</title>
  <meta name="description" content="Discover LDOC Studio features: discrete 120Hz GPU acceleration, air-gapped local disk storage, Merkle SHA-256 signing, and zero-drift Pretext typography.">
  <link rel="icon" type="image/png" href="/ldoc_logo.png">
  <link rel="shortcut icon" href="/app.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/design-system.css">
  <script defer src="/design-system.js"></script>
  <!-- Three.js loaded asynchronously on demand -->
  <style>
    /* ── Features Page Bespoke Styling ── */
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
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.28);
      font-size: 12px;
      font-weight: 700;
      color: var(--accent-light);
      margin-bottom: 24px;
      letter-spacing: 0.5px;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 8px var(--accent);
      animation: ldocPulse 2s infinite;
    }

    @keyframes ldocPulse {
      0%, 100% { opacity: 0.6; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.3); }
    }

    .hero-h1 {
      font-family: var(--font-display);
      font-size: clamp(38px, 6vw, 76px);
      font-weight: 800;
      line-height: 1.08;
      letter-spacing: -0.03em;
      margin-bottom: 24px;
      max-width: 980px;
      margin-left: auto;
      margin-right: auto;
      background: linear-gradient(180deg, #FFFFFF 30%, rgba(255, 255, 255, 0.7) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-h1 span.amber-gradient {
      background: linear-gradient(135deg, #F59E0B, #FBBF24);
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
      margin-bottom: 56px;
      flex-wrap: wrap;
      justify-content: center;
    }

    /* Hero Canvas Window */
    .hero-canvas-frame {
      max-width: 1040px;
      margin: 0 auto 100px;
      background: rgba(14, 14, 21, 0.75);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.12);
      overflow: hidden;
      text-align: left;
    }

    .canvas-titlebar {
      background: rgba(21, 21, 31, 0.9);
      padding: 12px 18px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .window-dots {
      display: flex;
      gap: 8px;
    }
    .w-dot { width: 11px; height: 11px; border-radius: 50%; }
    .w-dot-red { background: #EF4444; }
    .w-dot-yellow { background: #F59E0B; }
    .w-dot-green { background: #10B981; }

    .canvas-tabs {
      display: flex;
      gap: 4px;
      background: rgba(255, 255, 255, 0.04);
      padding: 3px;
      border-radius: var(--radius-full);
    }

    .canvas-tab {
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
      padding: 5px 14px;
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all 0.2s var(--ease-spring);
    }
    .canvas-tab.active {
      background: rgba(245, 158, 11, 0.16);
      color: #FFFFFF;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }

    .canvas-body {
      padding: 32px;
      min-height: 420px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: radial-gradient(circle at 50% 50%, rgba(21, 21, 31, 0.5) 0%, rgba(10, 10, 15, 0.95) 100%);
    }

    .tab-pane { display: none; }
    .tab-pane.active { display: block; }

    /* Financial Tab */
    .fin-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      align-items: center;
    }
    @media (max-width: 768px) {
      .fin-grid { grid-template-columns: 1fr; }
    }
    .fin-controls {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      padding: 24px;
      border-radius: var(--radius-sm);
    }
    .fin-slider-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .fin-slider {
      width: 100%;
      height: 6px;
      accent-color: var(--accent);
      margin-bottom: 20px;
      cursor: pointer;
    }
    .fin-metric-card {
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      padding: 20px;
      border-radius: var(--radius-sm);
      text-align: center;
    }
    .fin-metric-val {
      font-size: 2.2rem;
      font-weight: 800;
      color: #38BDF8;
      font-family: var(--font-mono);
      margin-bottom: 4px;
    }
    .fin-metric-desc {
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* 3D Wireframe Tab */
    .mesh-stage {
      text-align: center;
      position: relative;
    }
    .mesh-canvas {
      width: 100%;
      height: 320px;
      border-radius: var(--radius-sm);
      background: rgba(0, 0, 0, 0.4);
    }
    .mesh-badge {
      position: absolute;
      bottom: 14px;
      right: 14px;
      background: rgba(0, 0, 0, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      color: #22D3EE;
      font-family: var(--font-mono);
    }

    /* Code Sandbox Tab */
    .code-stage {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
    }
    @media (max-width: 768px) {
      .code-stage { grid-template-columns: 1fr; }
    }
    .code-editor {
      background: #060911;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 18px;
      font-family: var(--font-mono);
      font-size: 13px;
      color: #93C5FD;
      line-height: 1.6;
      overflow-x: auto;
    }
    .code-output {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }

    /* Section Styling */
    .section-wrap {
      max-width: var(--max-width);
      margin: 0 auto 120px;
      padding: 0 24px;
    }

    .section-head {
      text-align: center;
      margin-bottom: 56px;
    }
    .section-tag {
      color: var(--accent-light);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
      display: inline-block;
    }
    .section-title {
      font-family: var(--font-display);
      font-size: clamp(28px, 4vw, 44px);
      font-weight: 800;
      letter-spacing: -0.025em;
      margin-bottom: 16px;
      color: #FFFFFF;
    }
    .section-sub {
      font-size: 16px;
      color: var(--muted);
      max-width: 680px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* Capability Cards */
    .capability-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .capability-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .capability-grid { grid-template-columns: 1fr; }
    }

    .cap-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 32px 28px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      transition: all 0.25s var(--ease-spring);
      position: relative;
    }
    .cap-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-4px);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
    }
    .cap-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent);
    }
    .cap-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .cap-desc {
      font-size: 14px;
      color: var(--muted);
      line-height: 1.6;
    }

    /* Vanguard-7 Interactive Showcase Console */
    .showcase-console {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 36px;
      margin-top: 48px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }
    @media (max-width: 768px) {
      .showcase-console { padding: 20px; }
    }
    .console-grid {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 36px;
      align-items: center;
    }
    @media (max-width: 900px) {
      .console-grid { grid-template-columns: 1fr; }
    }

    .console-canvas-wrap {
      position: relative;
      background: #05060A;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      min-height: 380px;
    }
    #feat-webgl-canvas {
      width: 100%;
      height: 380px;
      display: block;
    }

    .console-controls {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .telemetry-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .telemetry-pill {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      text-align: center;
    }
    .telemetry-num {
      font-family: var(--font-mono);
      font-size: 18px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .telemetry-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--dim);
      margin-top: 2px;
    }

    .tamper-box {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: var(--radius-sm);
      padding: 18px;
      display: flex;
      align-items: flex-start;
      gap: 14px;
      transition: all 0.2s ease;
    }
    .tamper-box.tampered {
      background: rgba(244, 63, 94, 0.1);
      border-color: rgba(244, 63, 94, 0.35);
    }
    .tamper-icon {
      flex-shrink: 0;
      margin-top: 2px;
      color: var(--emerald);
    }
    .tamper-box.tampered .tamper-icon {
      color: var(--rose);
    }

    /* Trust Layer 6 Cards */
    .trust-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    @media (max-width: 900px) {
      .trust-grid { grid-template-columns: 1fr; }
    }
    .trust-item {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.2s ease;
    }
    .trust-item:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }
    .spec-tag {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      padding: 2px 8px;
      border-radius: 4px;
      width: fit-content;
    }
    .trust-item-title {
      font-family: var(--font-display);
      font-size: 17px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .trust-item-desc {
      font-size: 13.5px;
      color: var(--muted);
      line-height: 1.55;
    }

    /* CTA Section */
    .cta-banner {
      background: linear-gradient(180deg, rgba(21, 21, 31, 0.8) 0%, rgba(14, 14, 21, 0.95) 100%);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 72px 32px;
      text-align: center;
      position: relative;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(245, 158, 11, 0.15);
    }
    .cta-title {
      font-family: var(--font-display);
      font-size: clamp(32px, 4.5vw, 48px);
      font-weight: 800;
      color: #FFFFFF;
      margin-bottom: 16px;
    }
    .cta-sub {
      font-size: 16px;
      color: var(--muted);
      max-width: 600px;
      margin: 0 auto 36px;
      line-height: 1.6;
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
        <a href="/format" class="ldoc-nav-link">Format</a>
        <a href="/features" class="ldoc-nav-link active">Features</a>
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
      <span class="pulse-dot"></span>
      <span>NEXT-GEN COMPUTATIONAL ARCHITECTURE</span>
    </div>

    <h1 class="hero-h1 ldoc-reveal" data-delay="100ms">
      Documents engineered as <span class="amber-gradient">living software.</span>
    </h1>

    <p class="hero-lead ldoc-reveal" data-delay="200ms">
      Static PDFs and fragile cloud docs were built for printing on dead trees. LDOC Studio turns every page into an offline-first, GPU-accelerated computing environment with cryptographic provenance.
    </p>

    <div class="hero-ctas ldoc-reveal" data-delay="300ms">
      <a href="/live-studio" class="ldoc-btn-primary" style="padding: 12px 28px; font-size: 15px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Launch Web Studio</span>
      </a>
      <a href="${directBuyUrl}" target="_blank" class="ldoc-btn-secondary" style="padding: 12px 24px; font-size: 15px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>Get Studio Pro ($19)</span>
      </a>
    </div>

    <!-- Hero Interactive Canvas Window -->
    <div class="hero-canvas-frame ldoc-reveal" data-delay="400ms">
      <div class="canvas-titlebar">
        <div class="window-dots">
          <span class="w-dot w-dot-red"></span>
          <span class="w-dot w-dot-yellow"></span>
          <span class="w-dot w-dot-green"></span>
        </div>
        <div class="canvas-tabs">
          <button class="canvas-tab active" onclick="switchHeroTab('fin', this)">Financial Reactive DAG</button>
          <button class="canvas-tab" onclick="switchHeroTab('mesh', this)">Spatial 3D Mesh</button>
          <button class="canvas-tab" onclick="switchHeroTab('code', this)">AST JSON Engine</button>
        </div>
        <a href="/live-studio" class="ldoc-btn-ghost" style="font-size: 11.5px; padding: 4px 10px;">
          <span>Open Fullscreen &rarr;</span>
        </a>
      </div>

      <div class="canvas-body">
        <!-- Tab 1: Financial Reactive DAG -->
        <div class="tab-pane active" id="tab-fin">
          <div class="fin-grid">
            <div class="fin-controls">
              <div class="fin-slider-label">
                <span>Revenue Target (ARR)</span>
                <span id="fin-slider-val" style="color: var(--accent); font-family: var(--font-mono); font-weight: 700;">$5,400,000</span>
              </div>
              <input type="range" class="fin-slider" id="fin-arr-slider" min="1000000" max="15000000" step="100000" value="5400000" oninput="updateFinDemo(this.value)">
              <p style="font-size: 12px; color: var(--dim); line-height: 1.5;">
                Every formula node in the AST dependency graph recalculates in topological order with zero circular lockups.
              </p>
            </div>
            <div class="fin-metric-card">
              <div class="fin-metric-val" id="fin-profit-val">$1,890,000</div>
              <div class="fin-metric-desc">Computed Operating Income (35% Margin)</div>
            </div>
          </div>
        </div>

        <!-- Tab 2: Spatial 3D Mesh -->
        <div class="tab-pane" id="tab-mesh">
          <div class="mesh-stage">
            <canvas class="mesh-canvas" id="hero-mesh-canvas"></canvas>
            <div class="mesh-badge">120Hz Hardware WebGL Engine</div>
          </div>
        </div>

        <!-- Tab 3: Code Sandbox -->
        <div class="tab-pane" id="tab-code">
          <div class="code-stage">
            <pre class="code-editor"><code>{
  "specVersion": "3.0.0",
  "block": "reactive-calculation",
  "id": "node-eb41",
  "expression": "arr * (1 - cogs_ratio)",
  "state": "RESOLVED_PRECISE",
  "merkleHash": "8f3b29c0174ad8e"
}</code></pre>
            <div class="code-output">
              <div style="font-family: var(--font-mono); font-size: 24px; font-weight: 800; color: #10B981; margin-bottom: 6px;">0.00ms</div>
              <div style="font-size: 12px; color: var(--dim); text-transform: uppercase;">AST Topological Evaluation Time</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Section 1: Core Capabilities (Bento) -->
  <section class="section-wrap">
    <div class="section-head ldoc-reveal">
      <span class="section-tag">CORE CAPABILITIES</span>
      <h2 class="section-title">Built for the Next Century of Computing</h2>
      <p class="section-sub">Zero browser reflow guesswork. No proprietary vendor lock-in. Real engineering primitives designed for high-stakes documentation.</p>
    </div>

    <div class="capability-grid">
      <div class="cap-card ldoc-reveal" data-delay="60ms">
        <div class="cap-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </div>
        <h3 class="cap-title">Write Anywhere</h3>
        <p class="cap-desc">Local-first desktop application for Windows, macOS, and Linux with full offline air-gap execution. Zero telemetry pinged to cloud servers.</p>
      </div>

      <div class="cap-card ldoc-reveal" data-delay="120ms">
        <div class="cap-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
        </div>
        <h3 class="cap-title">Spatial 3D &amp; CAD</h3>
        <p class="cap-desc">Embed native interactive WebGL models with Draco decompression. Text flows seamlessly around 3D geometry with exclusion zone carving.</p>
      </div>

      <div class="cap-card ldoc-reveal" data-delay="180ms">
        <div class="cap-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <h3 class="cap-title">Reactive AST Graphs</h3>
        <p class="cap-desc">Live reactive variable DAG evaluates mathematical formulas in real time as readers interact with sliders, dropdowns, and live queries.</p>
      </div>

      <div class="cap-card ldoc-reveal" data-delay="240ms">
        <div class="cap-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </div>
        <h3 class="cap-title">Slide Presentations</h3>
        <p class="cap-desc">Switch seamlessly between multi-column continuous document reading mode and slide deck presentation runtime with a single shortcut.</p>
      </div>

      <div class="cap-card ldoc-reveal" data-delay="300ms">
        <div class="cap-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <h3 class="cap-title">Lossless Conversion</h3>
        <p class="cap-desc">Convert existing Markdown, DOCX, and Notion archives directly into .ldocx format with full preservation of hierarchical headings and media.</p>
      </div>

      <div class="cap-card ldoc-reveal" data-delay="360ms">
        <div class="cap-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h3 class="cap-title">Merkle Cryptographic Trust</h3>
        <p class="cap-desc">Every block digest is signed with SHA-256 and verified through a Merkle root tree. Any unauthorized tampering invalidates the signature instantly.</p>
      </div>
    </div>
  </section>

  <!-- Section 2: Vanguard-7 Interactive Showcase Console -->
  <section class="section-wrap">
    <div class="section-head ldoc-reveal">
      <span class="section-tag">HARDWARE TELEMETRY IN ACTION</span>
      <h2 class="section-title">Vanguard-7 Autonomous Actuator Spec</h2>
      <p class="section-sub">Experience real-time kinematics binding: slide torque to recalculate thermal and stress metrics, and test Merkle tamper detection.</p>
    </div>

    <div class="showcase-console ldoc-reveal">
      <div class="console-grid">
        <div class="console-canvas-wrap">
          <canvas id="feat-webgl-canvas"></canvas>
          <div style="position: absolute; top: 14px; left: 14px; background: rgba(0,0,0,0.7); border: 1px solid var(--border); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-family: var(--font-mono); color: #38BDF8;">
            VANGUARD-7 ACTUATOR • 60 FPS
          </div>
        </div>

        <div class="console-controls">
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-size: 14px; font-weight: 600; color: #FFFFFF;">Applied Torque Output</span>
              <span id="feat-torque-display" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">340 Nm</span>
            </div>
            <input type="range" class="fin-slider" id="feat-torque-slider" min="100" max="600" value="340" oninput="updateFeatTorque(this.value)">
          </div>

          <div class="telemetry-row">
            <div class="telemetry-pill">
              <div class="telemetry-num" id="feat-temp-display">+42.8°C</div>
              <div class="telemetry-label">Coil Temp</div>
            </div>
            <div class="telemetry-pill">
              <div class="telemetry-num" id="feat-eff-display">96.4%</div>
              <div class="telemetry-label">Efficiency</div>
            </div>
            <div class="telemetry-pill">
              <div class="telemetry-num" id="feat-stress-display">184 MPa</div>
              <div class="telemetry-label">Von Mises</div>
            </div>
          </div>

          <div class="tamper-box" id="feat-tamper-box">
            <svg class="tamper-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div>
              <div id="feat-tamper-title" style="font-weight: 700; font-size: 14px; color: #FFFFFF; margin-bottom: 2px;">
                Hardware Provenance Verified
              </div>
              <div id="feat-tamper-desc" style="font-size: 12.5px; color: var(--muted); line-height: 1.5;">
                Every block hash cascades into the signed root digest, detecting any single-bit alteration instantly.
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 12px; margin-top: 4px;">
            <button type="button" id="btn-feat-tamper" onclick="tamperFeatMerkle()" class="ldoc-btn-ghost" style="border: 1px solid rgba(244, 63, 94, 0.4); color: #FDA4AF; font-size: 12.5px;">
              Simulate Bit Tamper
            </button>
            <button type="button" id="btn-feat-restore" onclick="restoreFeatMerkle()" class="ldoc-btn-ghost" style="border: 1px solid rgba(16, 185, 129, 0.4); color: #6EE7B7; font-size: 12.5px; display: none;">
              Restore Integrity
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Section 3: Technical Trust Layer -->
  <section class="section-wrap">
    <div class="section-head ldoc-reveal">
      <span class="section-tag">CRYPTOGRAPHIC COMPLIANCE</span>
      <h2 class="section-title">Technical Trust Layer</h2>
      <p class="section-sub">Audited specifications ensuring your engineering intelligence survives twenty years into the future without bit-rot.</p>
    </div>

    <div class="trust-grid">
      <div class="trust-item ldoc-reveal" data-delay="60ms">
        <span class="spec-tag">SPEC-01</span>
        <h4 class="trust-item-title">Air-Gapped Execution</h4>
        <p class="trust-item-desc">Zero telemetry, zero forced third-party cloud logins. All AST evaluation and rendering run strictly in local RAM.</p>
      </div>

      <div class="trust-item ldoc-reveal" data-delay="120ms">
        <span class="spec-tag">SPEC-02</span>
        <h4 class="trust-item-title">Pretext Zero-Drift Layout</h4>
        <p class="trust-item-desc">Line breaking, hyphenation, and heights computed via deterministic integer arithmetic. 100% identical across editor and PDF flattener.</p>
      </div>

      <div class="trust-item ldoc-reveal" data-delay="180ms">
        <span class="spec-tag">SPEC-03</span>
        <h4 class="trust-item-title">Dual-Container Archive</h4>
        <p class="trust-item-desc">Modern manifest.json + document.json paired with legacy spec.json and self-contained 20-year archival fallback.html.</p>
      </div>

      <div class="trust-item ldoc-reveal" data-delay="240ms">
        <span class="spec-tag">SPEC-04</span>
        <h4 class="trust-item-title">Draco 3D Geometry</h4>
        <p class="trust-item-desc">Edge-breaker compression reduces complex robotics and CAD meshes by up to 92% with sub-10ms decompression.</p>
      </div>

      <div class="trust-item ldoc-reveal" data-delay="300ms">
        <span class="spec-tag">SPEC-05</span>
        <h4 class="trust-item-title">Headless CLI Flattener</h4>
        <p class="trust-item-desc">Compile living documents into print-ready archival PDFs in headless CI/CD environments without spinning up heavy browser runtimes.</p>
      </div>

      <div class="trust-item ldoc-reveal" data-delay="360ms">
        <span class="spec-tag">SPEC-06</span>
        <h4 class="trust-item-title">Open Specification</h4>
        <p class="trust-item-desc">Fully documented JSON block schema licensed under Apache 2.0 with type-safe @ldoc/sdk integration libraries.</p>
      </div>
    </div>
  </section>

  <!-- Final CTA Banner -->
  <section class="section-wrap">
    <div class="cta-banner ldoc-reveal">
      <h2 class="cta-title">Ready to Experience Living Documents?</h2>
      <p class="cta-sub">
        Join engineering teams, researchers, and technical leaders building the next generation of interactive knowledge.
      </p>
      <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
        <a href="/live-studio" class="ldoc-btn-primary" style="padding: 14px 32px; font-size: 15px;">
          <span>Launch Web Studio &rarr;</span>
        </a>
        <a href="${directBuyUrl}" target="_blank" class="ldoc-btn-secondary" style="padding: 14px 28px; font-size: 15px;">
          <span>Get Studio Pro ($19 Lifetime)</span>
        </a>
      </div>
    </div>
  </section>

  <!-- Reusable Multi-Column Footer -->
  <footer class="ldoc-footer" style="background: var(--surface); border-top: 1px solid var(--border); padding: 80px 24px 40px;">
    <div style="max-width: var(--max-width); margin: 0 auto; display: grid; grid-template-columns: 2fr repeat(4, 1fr); gap: 40px; margin-bottom: 60px;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px;">
          <img src="/ldoc_logo.png" alt="LDOC Studio" style="width: 28px; height: 28px; border-radius: 6px;">
          <span style="font-family: var(--font-display); font-weight: 800; font-size: 18px; color: #FFFFFF;">LDOC Studio</span>
        </div>
        <p style="font-size: 13.5px; color: var(--muted); line-height: 1.6; max-width: 320px; margin-bottom: 20px;">
          The living document architecture engineered for high-stakes technical, scientific, and enterprise documentation.
        </p>
        <div style="display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--emerald); background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); padding: 4px 12px; border-radius: var(--radius-full);">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--emerald);"></span>
          <span>Engine v2.5.0 • Pretext Layout Active</span>
        </div>
      </div>

      <div>
        <h4 style="font-family: var(--font-display); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #FFFFFF; margin-bottom: 16px;">Product</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
          <a href="/features" style="color: var(--muted); text-decoration: none;">Features</a>
          <a href="/live-studio" style="color: var(--muted); text-decoration: none;">Live Studio</a>
          <a href="/models" style="color: var(--muted); text-decoration: none;">Models Hub</a>
          <a href="/pricing" style="color: var(--muted); text-decoration: none;">Pricing</a>
          <a href="/changelog" style="color: var(--muted); text-decoration: none;">Changelog</a>
        </div>
      </div>

      <div>
        <h4 style="font-family: var(--font-display); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #FFFFFF; margin-bottom: 16px;">Standard</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
          <a href="/format" style="color: var(--muted); text-decoration: none;">.ldocx Format Spec</a>
          <a href="/docs" style="color: var(--muted); text-decoration: none;">Developer SDK</a>
          <a href="/security" style="color: var(--muted); text-decoration: none;">Security &amp; Air-Gap</a>
          <a href="/docs" style="color: var(--muted); text-decoration: none;">CLI Flattener</a>
        </div>
      </div>

      <div>
        <h4 style="font-family: var(--font-display); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #FFFFFF; margin-bottom: 16px;">Downloads</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
          <a href="/pricing" style="color: var(--muted); text-decoration: none;">Windows (.exe)</a>
          <a href="/pricing" style="color: var(--muted); text-decoration: none;">macOS (.dmg)</a>
          <a href="/pricing" style="color: var(--muted); text-decoration: none;">Linux (.tar.gz)</a>
          <a href="/pricing" style="color: var(--muted); text-decoration: none;">iOS Wrapper</a>
        </div>
      </div>

      <div>
        <h4 style="font-family: var(--font-display); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #FFFFFF; margin-bottom: 16px;">Legal</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
          <a href="/privacy" style="color: var(--muted); text-decoration: none;">Privacy Policy</a>
          <a href="/terms" style="color: var(--muted); text-decoration: none;">Terms of Service</a>
          <a href="/refund" style="color: var(--muted); text-decoration: none;">Refund Policy</a>
          <a href="/license" style="color: var(--muted); text-decoration: none;">License Agreement</a>
        </div>
      </div>
    </div>

    <div style="max-width: var(--max-width); margin: 0 auto; border-top: 1px solid var(--border); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: var(--dim); flex-wrap: wrap; gap: 16px;">
      <div>&copy; 2026 J AI ENTERPRISES. All rights reserved. LDOC and .ldocx are proprietary standards.</div>
      <div style="display: flex; gap: 20px;">
        <a href="https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT" target="_blank" style="color: var(--dim); text-decoration: none;">GitHub</a>
        <a href="mailto:jayaramankalidasan@gmail.com" style="color: var(--dim); text-decoration: none;">Enterprise Support</a>
      </div>
    </div>
  </footer>

  <!-- ── Interactive JavaScript Logic ── -->
  <script>
    // Tab Switching for Hero Canvas
    function switchHeroTab(tabId, btn) {
      document.querySelectorAll('.canvas-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const activePane = document.getElementById('tab-' + tabId);
      if (activePane) activePane.classList.add('active');

      if (tabId === 'mesh' && !window.heroMeshInitialized) {
        initHeroMesh();
      }
    }

    function updateFinDemo(arr) {
      const formattedArr = '$' + Number(arr).toLocaleString();
      document.getElementById('fin-slider-val').textContent = formattedArr;
      const profit = Math.round(arr * 0.35);
      document.getElementById('fin-profit-val').textContent = '$' + Number(profit).toLocaleString();
    }

    // Hero Wireframe Canvas
    function initHeroMesh() {
      window.heroMeshInitialized = true;
      const canvas = document.getElementById('hero-mesh-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = canvas.parentElement.clientWidth || 600;
      canvas.height = 320;

      let angle = 0;
      function draw() {
        ctx.fillStyle = '#060911';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = 80;

        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = angle + (i * Math.PI / 4);
          const x = cx + Math.cos(a) * radius;
          const y = cy + Math.sin(a) * (radius * 0.5);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = '#F59E0B';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = -angle + (i * Math.PI / 4);
          const x = cx + Math.cos(a) * (radius * 0.6);
          const y = cy + Math.sin(a) * (radius * 0.3);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();

        angle += 0.02;
        requestAnimationFrame(draw);
      }
      draw();
    }

    // Vanguard-7 Kinematics Simulation
    window.updateFeatTorque = function(val) {
      const disp = document.getElementById('feat-torque-display');
      if (disp) disp.textContent = val + ' Nm';

      const temp = document.getElementById('feat-temp-display');
      if (temp) {
        const computedTemp = (30 + (val - 100) * 0.06).toFixed(1);
        temp.textContent = '+' + computedTemp + '°C';
      }

      const eff = document.getElementById('feat-eff-display');
      if (eff) {
        const computedEff = (98.5 - (val - 100) * 0.009).toFixed(1);
        eff.textContent = computedEff + '%';
      }

      const stress = document.getElementById('feat-stress-display');
      if (stress) {
        const computedStress = Math.round(110 + (val - 100) * 0.28);
        stress.textContent = computedStress + ' MPa';
      }
    };

    window.tamperFeatMerkle = function() {
      const box = document.getElementById('feat-tamper-box');
      if (box) box.classList.add('tampered');
      const title = document.getElementById('feat-tamper-title');
      if (title) title.textContent = 'Cryptographic Root Invalidated';
      const desc = document.getElementById('feat-tamper-desc');
      if (desc) desc.textContent = 'Hash mismatch detected at node #0x4f2b. Document locked to preserve audit trail.';
      document.getElementById('btn-feat-tamper').style.display = 'none';
      document.getElementById('btn-feat-restore').style.display = 'inline-block';
    };

    window.restoreFeatMerkle = function() {
      const box = document.getElementById('feat-tamper-box');
      if (box) box.classList.remove('tampered');
      const title = document.getElementById('feat-tamper-title');
      if (title) title.textContent = 'Hardware Provenance Verified';
      const desc = document.getElementById('feat-tamper-desc');
      if (desc) desc.textContent = 'Every block hash cascades into the signed root digest, detecting any single-bit alteration instantly.';
      document.getElementById('btn-feat-tamper').style.display = 'inline-block';
      document.getElementById('btn-feat-restore').style.display = 'none';
    };

    // Initialize Vanguard-7 WebGL Canvas
    function initVanguardCanvas() {
      const canvas = document.getElementById('feat-webgl-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = canvas.parentElement.clientWidth || 500;
      canvas.height = 380;

      let t = 0;
      function render() {
        ctx.fillStyle = '#05060A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Draw rotating vector gear
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const teeth = 16;
        for (let i = 0; i < teeth; i++) {
          const a1 = t + (i * Math.PI * 2 / teeth);
          const a2 = t + ((i + 0.5) * Math.PI * 2 / teeth);
          const r1 = 90;
          const r2 = 105;
          ctx.lineTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
          ctx.lineTo(cx + Math.cos(a1) * r2, cy + Math.sin(a1) * r2);
          ctx.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
          ctx.lineTo(cx + Math.cos(a2) * r1, cy + Math.sin(a2) * r1);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner rotor ring
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 55, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - 130, cy); ctx.lineTo(cx + 130, cy);
        ctx.moveTo(cx, cy - 130); ctx.lineTo(cx, cy + 130);
        ctx.stroke();

        t += 0.015;
        requestAnimationFrame(render);
      }
      render();
    }

    window.addEventListener('DOMContentLoaded', () => {
      initVanguardCanvas();
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '..', 'features.html'), featuresHtml, 'utf8');
console.log('Successfully rebuilt features.html with premium design system!');
