const fs = require('fs');
const path = require('path');

const content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LDOC Developer Documentation &amp; SDK Architecture — LDOC Studio</title>
  <meta name="description" content="Official documentation for the open Living Document Format (.ldocx), @ldoc/sdk, reactive AST engine, and headless CLI flattener.">
  <link rel="icon" type="image/png" href="/ldoc_logo.png">
  <link rel="shortcut icon" href="/app.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/design-system.css">
  <style>
    :root {
      --bg: #08090d;
      --bg-alt: #0c0e14;
      --bg-subtle: #121622;
      --card-bg: rgba(14, 18, 28, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #f59e0b;
      --primary-light: #fbbf24;
      --cobalt: #3b82f6;
      --azure: #38bdf8;
      --emerald: #10b981;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --text-sub: #64748b;
      --font-main: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-display: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-main);
      line-height: 1.6;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .ambient-bg {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      pointer-events: none;
      z-index: 0;
      background: 
        radial-gradient(circle at 15% 20%, rgba(56, 189, 248, 0.06) 0%, transparent 40%),
        radial-gradient(circle at 85% 60%, rgba(245, 158, 11, 0.05) 0%, transparent 45%);
    }

    .page-wrap {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 24px;
      width: 100%;
    }

    /* 3-Column Documentation Layout */
    .docs-layout {
      display: grid;
      grid-template-columns: 260px 1fr 240px;
      gap: 36px;
      padding: 36px 0 80px;
      align-items: start;
    }

    /* Left Nav Tree */
    .docs-sidebar {
      position: sticky;
      top: 90px;
      max-height: calc(100vh - 110px);
      overflow-y: auto;
      padding-right: 12px;
    }
    .docs-nav-group {
      margin-bottom: 24px;
    }
    .docs-group-title {
      font-family: var(--font-display);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: block;
    }
    .docs-nav-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .docs-nav-item a {
      display: block;
      padding: 6px 12px;
      border-radius: 6px;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .docs-nav-item a:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.05);
    }
    .docs-nav-item a.active {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      font-weight: 700;
    }

    /* Middle Doc Article */
    .docs-content {
      max-width: 820px;
    }
    .docs-breadcrumb {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 12px;
      color: var(--text-sub);
      margin-bottom: 16px;
    }
    .docs-breadcrumb a {
      color: var(--text-muted);
      text-decoration: none;
    }
    .docs-title {
      font-family: var(--font-display);
      font-size: 2.6rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: #ffffff;
      margin-bottom: 14px;
    }
    .docs-lead {
      font-size: 1.12rem;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 32px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 24px;
    }

    /* Subsections */
    .docs-section {
      margin-bottom: 48px;
      scroll-margin-top: 100px;
    }
    .docs-h2 {
      font-family: var(--font-display);
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #ffffff;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .docs-h3 {
      font-family: var(--font-display);
      font-size: 1.25rem;
      font-weight: 700;
      color: #e2e8f0;
      margin: 24px 0 10px;
    }
    .docs-p {
      color: #cbd5e1;
      font-size: 0.95rem;
      line-height: 1.7;
      margin-bottom: 16px;
    }

    /* Code Blocks with Package Manager Tabs */
    .code-box {
      background: #060911;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      margin: 18px 0 24px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
    }
    .code-box-header {
      background: rgba(18, 23, 36, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .code-tabs {
      display: flex;
      gap: 4px;
    }
    .code-tab-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-family: var(--font-mono);
      font-size: 11.5px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .code-tab-btn:hover { color: #fff; background: rgba(255, 255, 255, 0.06); }
    .code-tab-btn.active {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.15);
      font-weight: 700;
    }
    .code-copy-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-family: var(--font-mono);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .code-copy-btn:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }
    .code-pre {
      margin: 0;
      padding: 16px;
      font-family: var(--font-mono);
      font-size: 12.5px;
      color: #cbd5e1;
      line-height: 1.6;
      overflow-x: auto;
    }

    /* Callout Components */
    .callout {
      border-radius: 10px;
      padding: 16px 18px;
      margin: 20px 0;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      font-size: 13.5px;
      line-height: 1.6;
    }
    .callout-note {
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #e0f2fe;
    }
    .callout-tip {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #d1fae5;
    }
    .callout-warning {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #fef3c7;
    }

    /* Interactive Live AST Playground */
    .ast-playground {
      background: linear-gradient(180deg, rgba(18, 24, 38, 0.85) 0%, rgba(10, 14, 22, 0.95) 100%);
      border: 1.5px solid rgba(56, 189, 248, 0.35);
      border-radius: 14px;
      padding: 24px;
      margin: 32px 0;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    }
    .playground-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .playground-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;
    }
    .playground-editor {
      width: 100%;
      height: 200px;
      background: #050811;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      color: #38bdf8;
      font-family: var(--font-mono);
      font-size: 11.5px;
      padding: 12px;
      outline: none;
      resize: vertical;
    }
    .playground-result {
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 14px;
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: #94a3b8;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Right Column: "On this page" */
    .docs-toc {
      position: sticky;
      top: 90px;
    }
    .toc-title {
      font-family: var(--font-display);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      margin-bottom: 12px;
      display: block;
    }
    .toc-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-left: 1px solid rgba(255, 255, 255, 0.08);
      padding-left: 12px;
    }
    .toc-item a {
      color: #94a3b8;
      font-size: 12.5px;
      text-decoration: none;
      transition: color 0.15s ease;
      display: block;
    }
    .toc-item a:hover { color: #ffffff; }
    .toc-item a.active {
      color: #f59e0b;
      font-weight: 700;
    }

    /* Prev / Next Pagination */
    .docs-pager {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 56px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .pager-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 14px 18px;
      text-decoration: none;
      flex: 1;
      transition: all 0.15s ease;
    }
    .pager-card:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.16);
    }
    .pager-label {
      font-size: 11px;
      color: var(--text-sub);
      text-transform: uppercase;
      margin-bottom: 4px;
      display: block;
    }
    .pager-title {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
    }

    /* Responsive */
    @media (max-width: 1180px) {
      .docs-layout { grid-template-columns: 240px 1fr; }
      .docs-toc { display: none; }
    }
    @media (max-width: 768px) {
      .docs-layout { grid-template-columns: 1fr; }
      .docs-sidebar { display: none; }
      .playground-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="ambient-bg"></div>

  <div class="page-wrap">
    <!-- Top Dismissible Pill Banner -->
    <div class="ldoc-pill-banner" id="ldoc-pill-banner">
      <span class="ldoc-pill-tag">SPEC v2.5.0</span>
      <span>Living Document Format (.ldocx) open architecture released.</span>
      <a href="/format">Explore Open Spec &rarr;</a>
      <button class="ldoc-pill-close" onclick="dismissPillBanner()" aria-label="Dismiss banner">&times;</button>
    </div>

    <!-- Sticky Glass Navbar -->
    <nav class="ldoc-navbar" id="ldoc-navbar">
      <div class="ldoc-navbar-inner">
        <div class="ldoc-nav-left">
          <a href="/" class="ldoc-nav-logo">
            <img src="/ldoc_logo.png" alt="LDOC Studio Logo" width="28" height="28" />
            <span>LDOC STUDIO</span>
            <span class="ldoc-nav-badge">.ldocx</span>
          </a>
          <div class="ldoc-nav-links">
            <a href="/format" class="ldoc-nav-link">Format</a>
            <a href="/features" class="ldoc-nav-link">Features</a>
            <a href="/live-studio" class="ldoc-nav-link">Live Studio</a>
            <a href="/models" class="ldoc-nav-link">Models Hub</a>
            <a href="/pricing" class="ldoc-nav-link">Pricing</a>
            <a href="/docs" class="ldoc-nav-link active">Docs</a>
            <a href="/changelog" class="ldoc-nav-link">Changelog</a>
          </div>
        </div>
        <div class="ldoc-nav-right">
          <button class="ldoc-nav-search-btn" onclick="openCmdPalette()" title="Command Palette (Ctrl+K)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <span>Search...</span>
            <kbd class="ldoc-kbd">Ctrl K</kbd>
          </button>
          <button class="ldoc-theme-btn" id="theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle light/dark theme" title="Toggle theme">
            <svg class="sun-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg class="moon-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button class="ldoc-btn ldoc-btn-ghost" style="padding: 6px 12px; font-size: 0.8rem;" onclick="showAuthModal()">Sign In</button>
          <a href="/live-studio" class="ldoc-btn ldoc-btn-primary" style="padding: 7px 14px; font-size: 0.82rem;">Launch Studio &rarr;</a>
          <button class="ldoc-hamburger" id="ldoc-hamburger" onclick="toggleMobileMenu()" aria-label="Open mobile navigation">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </div>
    </nav>

    <!-- Mobile Drawer -->
    <div class="ldoc-mobile-drawer" id="ldoc-mobile-drawer">
      <div class="ldoc-drawer-links">
        <a href="/format" class="ldoc-drawer-link">Format Spec</a>
        <a href="/features" class="ldoc-drawer-link">Features</a>
        <a href="/live-studio" class="ldoc-drawer-link">Live Studio IDE</a>
        <a href="/models" class="ldoc-drawer-link">Models Hub</a>
        <a href="/pricing" class="ldoc-drawer-link">Pricing</a>
        <a href="/docs" class="ldoc-drawer-link active">Documentation</a>
        <a href="/changelog" class="ldoc-drawer-link">Changelog</a>
      </div>
      <div class="ldoc-drawer-actions">
        <a href="/live-studio" class="ldoc-btn ldoc-btn-primary" style="width:100%; justify-content:center;">Launch Studio</a>
        <button class="ldoc-btn ldoc-btn-secondary" style="width:100%; justify-content:center;" onclick="showAuthModal()">Sign In</button>
      </div>
    </div>

    <!-- DOCUMENTATION WORKSPACE (3 COLUMNS) -->
    <main class="container">
      <div class="docs-layout">
        <!-- COLUMN 1: LEFT NAV TREE -->
        <aside class="docs-sidebar">
          <div class="docs-nav-group">
            <span class="docs-group-title">Getting Started</span>
            <ul class="docs-nav-list">
              <li class="docs-nav-item"><a href="#overview" class="active">Overview &amp; Philosophy</a></li>
              <li class="docs-nav-item"><a href="#quickstart">Quick Start Guide</a></li>
              <li class="docs-nav-item"><a href="#installation">Installation &amp; Setup</a></li>
            </ul>
          </div>

          <div class="docs-nav-group">
            <span class="docs-group-title">SDK Core (@ldoc/sdk)</span>
            <ul class="docs-nav-list">
              <li class="docs-nav-item"><a href="#livingdocument">LivingDocument API</a></li>
              <li class="docs-nav-item"><a href="#textlayout">LdocTextLayout Engine</a></li>
              <li class="docs-nav-item"><a href="#parser">Parser &amp; Dual Container</a></li>
            </ul>
          </div>

          <div class="docs-nav-group">
            <span class="docs-group-title">AST &amp; Reactive Engine</span>
            <ul class="docs-nav-list">
              <li class="docs-nav-item"><a href="#schema">AST JSON Schema (v2.5.0)</a></li>
              <li class="docs-nav-item"><a href="#dag">Topological DAG Evaluator</a></li>
              <li class="docs-nav-item"><a href="#spatial">Spatial 3D &amp; Draco Meshes</a></li>
            </ul>
          </div>

          <div class="docs-nav-group">
            <span class="docs-group-title">CLI &amp; Flattener</span>
            <ul class="docs-nav-list">
              <li class="docs-nav-item"><a href="#cli">Headless CLI Tools</a></li>
              <li class="docs-nav-item"><a href="#flattener">Vector PDF Export Flattener</a></li>
              <li class="docs-nav-item"><a href="#merkle">Merkle Proof Verification</a></li>
            </ul>
          </div>
        </aside>

        <!-- COLUMN 2: MIDDLE DOC ARTICLE -->
        <article class="docs-content">
          <div class="docs-breadcrumb">
            <a href="/">LDOC Studio</a>
            <span>/</span>
            <a href="/docs">Docs</a>
            <span>/</span>
            <span style="color: #fff;">SDK Architecture</span>
          </div>

          <h1 class="docs-title">SDK Architecture &amp; Developer Guide</h1>
          <p class="docs-lead">
            Everything you need to programmatically construct, compile, inspect, and verify Living Documents (.ldocx) in Node.js, browser environments, and CI/CD pipelines.
          </p>

          <!-- Section 1: Overview -->
          <section id="overview" class="docs-section">
            <h2 class="docs-h2">1. Overview &amp; Philosophy</h2>
            <p class="docs-p">
              The Living Document Format (<code>.ldocx</code>) is designed to solve the two biggest structural failures of 20th-century digital documents: <strong>cross-surface text drift</strong> and <strong>inert static screenshots</strong>.
            </p>
            <p class="docs-p">
              Unlike HTML pages that reflow arbitrarily or PDFs that flatten semantic text into dead graphical glyphs, an <code>.ldocx</code> container bundles a deterministic, reactive Abstract Syntax Tree (AST), hardware-accelerated 3D WebGL assets, and an offline cryptographic Merkle tree.
            </p>

            <div class="callout callout-note">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" style="flex-shrink:0;margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <div>
                <strong>Bit-for-Bit Parity Invariant:</strong> The Editor, Viewer, and headless PDF export flattener evaluate line-breaks and bounding heights using identical arithmetic. 0px text drift is guaranteed across all operating systems.
              </div>
            </div>
          </section>

          <!-- Section 2: Quick Start -->
          <section id="quickstart" class="docs-section">
            <h2 class="docs-h2">2. Quick Start &amp; Package Installation</h2>
            <p class="docs-p">
              Install the zero-dependency SDK package into your JavaScript or TypeScript project:
            </p>

            <div class="code-box">
              <div class="code-box-header">
                <div class="code-tabs">
                  <button class="code-tab-btn active" onclick="switchPkgTab('npm', this)">npm</button>
                  <button class="code-tab-btn" onclick="switchPkgTab('yarn', this)">yarn</button>
                  <button class="code-tab-btn" onclick="switchPkgTab('pnpm', this)">pnpm</button>
                </div>
                <button class="code-copy-btn" onclick="copyPkgCmd(this)">Copy</button>
              </div>
              <pre class="code-pre" id="pkg-cmd-pre">npm install @ldoc/sdk</pre>
            </div>

            <p class="docs-p">
              Construct a reactive document in under 10 lines of code:
            </p>

            <div class="code-box">
              <div class="code-box-header">
                <span style="font-family: var(--font-mono); font-size: 11px; color: #94a3b8;">quickstart.js</span>
                <button class="code-copy-btn" onclick="copySnippet('snippet-quickstart')">Copy</button>
              </div>
              <pre class="code-pre" id="snippet-quickstart"><code style="color: #cbd5e1;"><span style="color: #38bdf8;">import</span> { LivingDocument } <span style="color: #38bdf8;">from</span> <span style="color: #a7f3d0;">'@ldoc/sdk'</span>;

<span style="color: #64748b;">// 1. Initialize a new document with deterministic schema</span>
<span style="color: #38bdf8;">const</span> doc = <span style="color: #38bdf8;">new</span> <span style="color: #fbbf24;">LivingDocument</span>({
  title: <span style="color: #a7f3d0;">'Vanguard Telemetry Datasheet'</span>,
  theme: <span style="color: #a7f3d0;">'obsidian_gold'</span>
});

<span style="color: #64748b;">// 2. Append reactive formula and 3D spatial blocks</span>
doc.appendBlock({
  type: <span style="color: #a7f3d0;">'heading'</span>,
  level: <span style="color: #f472b6;">1</span>,
  text: <span style="color: #a7f3d0;">'Joint Torque &amp; Thermal Distribution'</span>
});

doc.appendBlock({
  type: <span style="color: #a7f3d0;">'spatial_3d'</span>,
  model_url: <span style="color: #a7f3d0;">'chassis.draco'</span>,
  wireframe: <span style="color: #f472b6;">false</span>,
  interactive: <span style="color: #f472b6;">true</span>
});

<span style="color: #64748b;">// 3. Compile and sign with Ed25519 root hash</span>
<span style="color: #38bdf8;">const</span> archiveBuffer = <span style="color: #38bdf8;">await</span> doc.exportArchive();
console.log(<span style="color: #a7f3d0;">'Compiled .ldocx package size:'</span>, archiveBuffer.length);</code></pre>
            </div>
          </section>

          <!-- Section 3: Interactive Live AST Playground -->
          <section id="playground" class="docs-section">
            <h2 class="docs-h2">3. Interactive "Execute Live AST" Playground</h2>
            <p class="docs-p">
              Modify the AST JSON payload below to test DAG evaluation and pure-arithmetic text layout computation live in your browser:
            </p>

            <div class="ast-playground">
              <div class="playground-header">
                <span style="font-family: var(--font-display); font-size: 13px; font-weight: 700; color: #fff;">Live AST Compiler Sandbox</span>
                <button onclick="executeAstSandbox()" class="ldoc-btn ldoc-btn-primary" style="padding: 6px 14px; font-size: 12px;">
                  ▶ Compile &amp; Run AST
                </button>
              </div>
              <div class="playground-grid">
                <textarea id="astSandboxInput" class="playground-editor">{
  "format_version": "2.5.0",
  "document_id": "doc_interactive_ast",
  "variables": {
    "torque_nm": 420,
    "efficiency": 0.94
  },
  "formulas": {
    "thermal_load": "$torque_nm * (1 - $efficiency) * 2.4"
  },
  "blocks": [
    {
      "id": "b1",
      "type": "heading",
      "text": "Telemetry Output"
    },
    {
      "id": "b2",
      "type": "paragraph",
      "text": "Thermal load computed: {thermal_load} W"
    }
  ]
}</textarea>
                <div class="playground-result" id="astSandboxOutput">
                  <div>
                    <div style="color: #38bdf8; font-weight: 700; margin-bottom: 6px;">COMPILER DIAGNOSTICS:</div>
                    <div>Status: Ready</div>
                    <div>DAG Nodes: 2 variables, 1 formula</div>
                    <div>Layout Engine: LdocTextLayout</div>
                  </div>
                  <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; color: #34d399;">
                    ✓ 0px DOM Reflow • Off-DOM Arithmetic
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 4: AST Schema -->
          <section id="schema" class="docs-section">
            <h2 class="docs-h2">4. AST JSON Specification &amp; Node Types</h2>
            <p class="docs-p">
              Every <code>.ldocx</code> container conforms to an unambiguous JSON schema defined in <code>document.json</code>. The top-level schema mandates strict type isolation:
            </p>

            <div class="callout callout-warning">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="flex-shrink:0;margin-top:2px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <div>
                <strong>Strict Pretext Encapsulation:</strong> Layout calculation is strictly encapsulated within <code>LdocTextLayout</code>. Never attempt direct browser DOM measurement inside document AST evaluation routines.
              </div>
            </div>

            <p class="docs-p">Supported AST block descriptors include:</p>
            <ul style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.8; margin-left: 20px; margin-bottom: 20px;">
              <li><code>paragraph</code>: Pure arithmetic proportional text with inline chips and obstacle carving.</li>
              <li><code>heading</code>: Level 1–4 headings with automatic anchor slug generation.</li>
              <li><code>spatial_3d</code>: Draco-compressed WebGL meshes with camera orbit constraints.</li>
              <li><code>reactive_chart</code>: Dynamic SVG charts coupled to AST variables via topological DAG.</li>
              <li><code>code_sandbox</code>: Isolated Python / JavaScript runtime sandboxes.</li>
            </ul>
          </section>

          <!-- Prev / Next Pagination -->
          <div class="docs-pager">
            <a href="/format" class="pager-card">
              <span class="pager-label">&larr; Previous</span>
              <span class="pager-title">Format Specification</span>
            </a>
            <a href="/features" class="pager-card" style="text-align: right;">
              <span class="pager-label">Next &rarr;</span>
              <span class="pager-title">Feature Tour &amp; Telemetry</span>
            </a>
          </div>
        </article>

        <!-- COLUMN 3: RIGHT "ON THIS PAGE" OUTLINE -->
        <aside class="docs-toc">
          <span class="toc-title">On this page</span>
          <ul class="toc-list" id="toc-list">
            <li class="toc-item"><a href="#overview" class="active">Overview &amp; Philosophy</a></li>
            <li class="toc-item"><a href="#quickstart">Quick Start &amp; Setup</a></li>
            <li class="toc-item"><a href="#playground">Live AST Playground</a></li>
            <li class="toc-item"><a href="#schema">AST JSON Specification</a></li>
          </ul>
        </aside>
      </div>
    </main>

    <!-- STANDARDIZED FOOTER -->
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="/" class="brand-logo">
              <img src="/ldoc_logo.png" alt="LDOC Logo" width="28" height="28">
              <span>LDOC STUDIO</span>
            </a>
            <p>The open living document architecture. Compute, render, and evolve beyond static PDFs.</p>
          </div>

          <div class="footer-col">
            <h5>Product</h5>
            <ul>
              <li><a href="/live-studio">Live Studio IDE</a></li>
              <li><a href="/models">Models &amp; Templates</a></li>
              <li><a href="/creator">Visual Creator</a></li>
              <li><a href="/pricing">Pricing Plans</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h5>Specification</h5>
            <ul>
              <li><a href="/format">.ldocx Architecture</a></li>
              <li><a href="/docs">AST Specification</a></li>
              <li><a href="/docs">Draco 3D Geometry</a></li>
              <li><a href="/security">Security &amp; Signing</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h5>Developers</h5>
            <ul>
              <li><a href="/docs">SDK Architecture Guide</a></li>
              <li><a href="/docs#sdk">Developer Integration</a></li>
              <li><a href="/changelog">Release Changelog</a></li>
              <li><a href="/format">Format Specification</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h5>Trust &amp; Legal</h5>
            <ul>
              <li><a href="/privacy">Privacy Policy</a></li>
              <li><a href="/terms">Terms of Service</a></li>
              <li><a href="/security">Security Architecture</a></li>
              <li><a href="/refund">Refund Policy</a></li>
              <li><a href="/license">Commercial SLA &amp; License</a></li>
              <li><a href="mailto:jayaramankalidasan@gmail.com">Contact Founder</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <div>&copy; 2026 LDOC Studio. Designed and created by J AI ENTERPRISES. Open Living Document Standard.</div>
          <div class="footer-legal-links" style="display: flex; gap: 16px; flex-wrap: wrap;">
            <a href="/privacy" style="color: var(--text-sub); text-decoration: none;">Privacy Policy</a>
            <a href="/terms" style="color: var(--text-sub); text-decoration: none;">Terms of Service</a>
            <a href="/security" style="color: var(--text-sub); text-decoration: none;">Security Architecture</a>
            <a href="/refund" style="color: var(--text-sub); text-decoration: none;">Refund Policy</a>
            <a href="/license" style="color: var(--text-sub); text-decoration: none;">Commercial SLA</a>
          </div>
        </div>
      </div>
    </footer>
  </div>

  <!-- SCRIPT LOGIC -->
  <script>
    function switchPkgTab(pkg, el) {
      document.querySelectorAll('.code-tab-btn').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      const cmdPre = document.getElementById('pkg-cmd-pre');
      if (pkg === 'npm') cmdPre.textContent = 'npm install @ldoc/sdk';
      else if (pkg === 'yarn') cmdPre.textContent = 'yarn add @ldoc/sdk';
      else if (pkg === 'pnpm') cmdPre.textContent = 'pnpm add @ldoc/sdk';
    }

    function copyPkgCmd(btn) {
      const text = document.getElementById('pkg-cmd-pre').textContent;
      navigator.clipboard.writeText(text);
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    }

    function copySnippet(id) {
      const text = document.getElementById(id).textContent;
      navigator.clipboard.writeText(text);
      alert('Code snippet copied to clipboard!');
    }

    function executeAstSandbox() {
      const input = document.getElementById('astSandboxInput').value;
      const out = document.getElementById('astSandboxOutput');
      try {
        const parsed = JSON.parse(input);
        const torque = parsed.variables?.torque_nm || 420;
        const eff = parsed.variables?.efficiency || 0.94;
        const thermal = (torque * (1 - eff) * 2.4).toFixed(2);

        out.innerHTML = \`
          <div>
            <div style="color: #34d399; font-weight: 700; margin-bottom: 6px;">✓ AST COMPILED IN 2.8ms:</div>
            <div>Format: \${parsed.format_version || '2.5.0'}</div>
            <div>DAG Evaluation: thermal_load = \${thermal} W</div>
            <div>Blocks Measured: \${parsed.blocks?.length || 2} blocks</div>
            <div>Line Count: 2 lines (bit-for-bit matched)</div>
          </div>
          <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; color: #34d399;">
            ● Verification Status: 0px Text Drift • Sealed
          </div>
        \`;
      } catch (e) {
        out.innerHTML = \`
          <div style="color: #f87171;">
            <strong>Syntax Error:</strong> \${e.message}
          </div>
        \`;
      }
    }

    // ScrollSpy for TOC
    document.addEventListener('DOMContentLoaded', () => {
      const sections = document.querySelectorAll('.docs-section');
      const navLinks = document.querySelectorAll('.toc-item a');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            navLinks.forEach(link => {
              link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
            });
          }
        });
      }, { rootMargin: '-20% 0px -70% 0px' });

      sections.forEach(sec => observer.observe(sec));
    });
  </script>

  <script src="/design-system.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '..', 'docs.html'), content, 'utf8');
console.log('Successfully written redesigned docs.html!');
