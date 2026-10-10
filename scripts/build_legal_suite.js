const fs = require('fs');
const path = require('path');

function generateLegalPage({ title, metaDesc, tag, h1, lead, summaryBullets, lastUpdated, sections, isSecurity = false }) {
  const tocItems = sections.map((s, idx) => `
    <li class="toc-item"><a href="#sec-${idx + 1}" ${idx === 0 ? 'class="active"' : ''}>${s.title}</a></li>
  `).join('');

  const sectionsHtml = sections.map((s, idx) => `
    <section class="policy-card" id="sec-${idx + 1}">
      <h2 class="policy-h2"><span class="sec-num">0${idx + 1}.</span> ${s.title}</h2>
      ${s.content}
    </section>
  `).join('');

  const securityDiagramHtml = isSecurity ? `
    <div class="security-diagram-card">
      <div class="diagram-header">
        <span class="diagram-tag">SECURITY DEFENSE-IN-DEPTH ARCHITECTURE</span>
        <h3 class="diagram-title">Three Isolated Protection Boundaries</h3>
      </div>
      <div class="diagram-layers">
        <div class="diagram-layer layer-airgap">
          <div class="layer-badge">LAYER 1 • NETWORK BOUNDARY</div>
          <div class="layer-title">100% Air-Gapped &amp; Sovereign Egress Guard</div>
          <div class="layer-desc">Zero telemetry beacons. All 3D runtimes, math engines, and font metrics are bundled locally. Runs fully disconnected in secure air-gapped SCIF facilities.</div>
        </div>
        <div class="diagram-layer layer-sandbox">
          <div class="layer-badge">LAYER 2 • RUNTIME ISOLATION</div>
          <div class="layer-title">Zero-Privilege Sandboxed Execution Boundary</div>
          <div class="layer-desc">Raw <code>eval()</code> and <code>new Function()</code> strictly banned. Interactive charts, React widgets, and WebGL scenes execute in isolated <code>&lt;iframe sandbox&gt;</code> via sanitized postMessage RPC.</div>
        </div>
        <div class="diagram-layer layer-merkle">
          <div class="layer-badge">LAYER 3 • CRYPTOGRAPHIC PROVENANCE</div>
          <div class="layer-title">Merkle SHA-256 Tree &amp; Ed25519 Root Seal</div>
          <div class="layer-desc">Every block, paragraph, and 3D mesh is hashed into a cryptographic Merkle tree. Bit-level modifications trigger an instant integrity alarm in &lt;15ms.</div>
        </div>
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — LDOC Studio</title>
  <meta name="description" content="${metaDesc}">
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
      line-height: 1.65;
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
        radial-gradient(circle at 15% 15%, rgba(56, 189, 248, 0.06) 0%, transparent 40%),
        radial-gradient(circle at 85% 75%, rgba(245, 158, 11, 0.05) 0%, transparent 45%);
    }

    .page-wrap {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 24px;
      width: 100%;
    }

    /* Hero */
    .policy-hero {
      padding: 64px 0 32px;
      text-align: center;
    }
    .policy-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 14px;
      border-radius: 99px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #fbbf24;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 16px;
    }
    .policy-hero h1 {
      font-family: var(--font-display);
      font-size: clamp(2.2rem, 4vw, 3.2rem);
      font-weight: 800;
      color: #ffffff;
      line-height: 1.15;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
    }
    .policy-hero p {
      color: var(--text-muted);
      font-size: 1.05rem;
      max-width: 680px;
      margin: 0 auto 20px;
    }
    .meta-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      color: var(--text-sub);
      font-size: 12px;
      font-family: var(--font-mono);
      flex-wrap: wrap;
    }

    /* Layout: 70ch Centered Article + Sticky TOC */
    .legal-layout {
      display: grid;
      grid-template-columns: 1fr 240px;
      gap: 48px;
      padding: 24px 0 80px;
      align-items: start;
    }
    .legal-article {
      max-width: 72ch;
      width: 100%;
    }

    /* Plain English Summary Box */
    .plain-summary-card {
      background: rgba(18, 24, 38, 0.85);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 36px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    .summary-tag {
      font-family: var(--font-display);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #38bdf8;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
      display: block;
    }
    .summary-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .summary-list li {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .summary-list li span.chk {
      color: #34d399;
      font-weight: 800;
      flex-shrink: 0;
    }

    /* Sections */
    .policy-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 32px 36px;
      margin-bottom: 24px;
      backdrop-filter: blur(12px);
      scroll-margin-top: 100px;
    }
    .policy-h2 {
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 14px;
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .sec-num {
      color: var(--primary-light);
      font-family: var(--font-mono);
      font-size: 1.1rem;
    }
    .policy-card p {
      color: #cbd5e1;
      font-size: 0.95rem;
      line-height: 1.7;
      margin-bottom: 14px;
    }
    .policy-card ul {
      margin: 12px 0 16px 20px;
      color: #cbd5e1;
      font-size: 0.92rem;
      line-height: 1.7;
    }
    .policy-card li { margin-bottom: 6px; }
    .highlight-box {
      background: rgba(245, 158, 11, 0.08);
      border-left: 3px solid var(--primary);
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin: 16px 0;
      color: #fef3c7;
      font-size: 0.92rem;
      line-height: 1.6;
    }

    /* Security Architecture Diagram */
    .security-diagram-card {
      background: linear-gradient(180deg, rgba(14, 20, 32, 0.9) 0%, rgba(8, 12, 20, 0.95) 100%);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 36px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    }
    .diagram-header { margin-bottom: 20px; }
    .diagram-tag {
      font-family: var(--font-display);
      font-size: 11px;
      font-weight: 800;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      display: block;
      margin-bottom: 4px;
    }
    .diagram-title {
      font-family: var(--font-display);
      font-size: 1.35rem;
      font-weight: 800;
      color: #fff;
    }
    .diagram-layers {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .diagram-layer {
      border-radius: 10px;
      padding: 16px 20px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .layer-airgap { background: rgba(56, 189, 248, 0.08); border-color: rgba(56, 189, 248, 0.25); }
    .layer-sandbox { background: rgba(168, 85, 247, 0.08); border-color: rgba(168, 85, 247, 0.25); }
    .layer-merkle { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.25); }
    .layer-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 800;
      color: var(--text-muted);
      margin-bottom: 4px;
      letter-spacing: 0.05em;
    }
    .layer-title {
      font-family: var(--font-display);
      font-size: 14.5px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }
    .layer-desc {
      font-size: 12.5px;
      color: #cbd5e1;
      line-height: 1.5;
    }

    /* Sticky TOC */
    .legal-toc {
      position: sticky;
      top: 90px;
      background: rgba(14, 18, 28, 0.6);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 18px;
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
    }
    .toc-item a {
      color: #94a3b8;
      font-size: 12.5px;
      text-decoration: none;
      transition: color 0.15s ease;
      display: block;
      line-height: 1.4;
    }
    .toc-item a:hover { color: #ffffff; }
    .toc-item a.active {
      color: #f59e0b;
      font-weight: 700;
    }

    /* Print Styles */
    @media print {
      .ambient-bg, .ldoc-pill-banner, .ldoc-navbar, .legal-toc, .site-footer, .ldoc-btn {
        display: none !important;
      }
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .legal-layout { display: block !important; }
      .legal-article { max-width: 100% !important; }
      .policy-card {
        border: 1px solid #cccccc !important;
        background: transparent !important;
        box-shadow: none !important;
        break-inside: avoid;
      }
      .policy-h2, .policy-card p, .policy-card li {
        color: #000000 !important;
      }
    }

    @media (max-width: 900px) {
      .legal-layout { grid-template-columns: 1fr; }
      .legal-toc { display: none; }
      .policy-card { padding: 24px 20px; }
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
            <a href="/docs" class="ldoc-nav-link">Docs</a>
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
            <svg class="sun-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="12" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
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
        <a href="/docs" class="ldoc-drawer-link">Documentation</a>
        <a href="/changelog" class="ldoc-drawer-link">Changelog</a>
      </div>
      <div class="ldoc-drawer-actions">
        <a href="/live-studio" class="ldoc-btn ldoc-btn-primary" style="width:100%; justify-content:center;">Launch Studio</a>
        <button class="ldoc-btn ldoc-btn-secondary" style="width:100%; justify-content:center;" onclick="showAuthModal()">Sign In</button>
      </div>
    </div>

    <!-- MAIN ARTICLE -->
    <main class="container">
      <header class="policy-hero">
        <div class="policy-tag">${tag}</div>
        <h1>${h1}</h1>
        <p>${lead}</p>
        <div class="meta-bar">
          <span>Last Updated: ${lastUpdated}</span>
          <span>•</span>
          <span>Standard Version v2.5.0</span>
          <span>•</span>
          <span>J AI ENTERPRISES</span>
        </div>
      </header>

      <div class="legal-layout">
        <article class="legal-article">
          <!-- Plain English Summary Box -->
          <div class="plain-summary-card">
            <span class="summary-tag">SUMMARY IN PLAIN ENGLISH</span>
            <ul class="summary-list">
              ${summaryBullets.map(b => `<li><span class="chk">✓</span> <span>${b}</span></li>`).join('')}
            </ul>
          </div>

          ${securityDiagramHtml}

          <!-- Policy Sections -->
          ${sectionsHtml}
        </article>

        <!-- Sticky TOC -->
        <aside class="legal-toc">
          <span class="toc-title">Sections</span>
          <ul class="toc-list" id="legalTocList">
            ${tocItems}
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

  <script>
    // ScrollSpy for TOC
    document.addEventListener('DOMContentLoaded', () => {
      const sections = document.querySelectorAll('.policy-card');
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
}

// 1. SECURITY
const securityHtml = generateLegalPage({
  title: "Security Architecture & Cryptographic Trust",
  metaDesc: "Technical security architecture of LDOC Studio. Air-gapped isolation, WebCrypto ECDSA/Ed25519 signing, SHA-256 Merkle proofs, and iframe sandboxing.",
  tag: "CRYPTOGRAPHIC TRUST CENTER",
  h1: "Security &amp; Hardening Architecture",
  lead: "Defense-grade security by design. Cryptographic proof of origin, sandboxed execution boundaries, and zero cloud telemetry dependencies.",
  summaryBullets: [
    "Your documents never leave your machine unless you explicitly configure remote relays.",
    "Every block is cryptographically hashed with SHA-256 and signed with Ed25519 / ECDSA keys.",
    "Executable JavaScript and reactive formulas run in isolated sandboxed iframes with zero parent DOM access."
  ],
  lastUpdated: "October 10, 2026",
  isSecurity: true,
  sections: [
    {
      title: "Cryptographic Merkle SHA-256 & Ed25519 Signing",
      content: `
        <p>Every living document created or compiled with LDOC Studio is sealed with a deterministic <strong>SHA-256 Merkle Tree and Ed25519 digital signature manifest</strong>:</p>
        <ul>
          <li>Upon document compilation, the manifest metadata and block payloads are individually digested using <code>SHA-256</code>.</li>
          <li>The root digest is signed by the author's private key, producing an authentic signature saved to <code>signatures/ed25519.sig</code>.</li>
          <li>The author's public key is bundled in JSON Web Key (JWK) format at <code>signatures/public-key.jwk</code>.</li>
          <li>Upon opening, local integrity validation computes the verification locally, raising an alarm in &lt;15ms if even a single character or mesh coordinate is tampered with.</li>
        </ul>
      `
    },
    {
      title: "Zero-Privilege Sandboxed Runtime Isolation",
      content: `
        <p>Dynamic living documents execute user-provided code, interactive charts, and WebGL models. To prevent arbitrary code execution vulnerabilities:</p>
        <ul>
          <li><strong>Raw <code>new Function()</code> and <code>eval()</code> are completely banned</strong> across all runtime parsers and viewers.</li>
          <li>All JavaScript widgets, React JSX blocks, and Chart.js code execute inside origin-isolated <code>&lt;iframe sandbox="allow-scripts"&gt;</code> elements.</li>
          <li>The iframe is strictly isolated from parent DOM trees, localStorage, cookies, and tokens, communicating solely through sanitized <code>postMessage</code> RPC protocols.</li>
        </ul>
      `
    },
    {
      title: "Native Desktop Chromium Hardening",
      content: `
        <p>In the standalone desktop application, security controls are enforced at the native Chromium level:</p>
        <ul>
          <li><code>webSecurity: true</code> is enforced to uphold standard Same-Origin Policy.</li>
          <li><code>nodeIntegration: false</code> guarantees renderer processes cannot access Node.js APIs or native OS shell paths directly.</li>
          <li><code>contextIsolation: true</code> prevents prototype pollution between web content and preload scripts.</li>
          <li><code>allowRunningInsecureContent: false</code> blocks mixed-content network attempts.</li>
        </ul>
      `
    },
    {
      title: "Air-Gapped & Sovereign Network Compliance",
      content: `
        <p>LDOC Studio and the standalone mobile APK are engineered to operate in <strong>100% air-gapped environments (SCIF, shipboard, military, nuclear, and financial server rooms)</strong>. All vendor scripts (Three.js, Chart.js, OrbitControls, GLTFLoader) are bundled locally. The application never requires an internet handshake to view, edit, or sign documents.</p>
      `
    },
    {
      title: "Vulnerability Disclosure & Security Contact",
      content: `
        <p>We welcome audits and vulnerability reports from independent security researchers. If you identify a potential security issue or cryptographic weakness, please disclose responsibly to:</p>
        <div class="highlight-box">
          <strong>Security Response Team:</strong> Jayaraman K &lt;<a href="mailto:jayaramankalidasan@gmail.com" style="color:var(--primary-light)">jayaramankalidasan@gmail.com</a>&gt;<br>
          We acknowledge reports within 24 hours and provide transparent CVE attribution for verified security advisories.
        </div>
      `
    }
  ]
});

// 2. PRIVACY
const privacyHtml = generateLegalPage({
  title: "Privacy Policy & Sovereign Data Autonomy",
  metaDesc: "Official Privacy Policy for LDOC Studio. 100% air-gapped autonomy, zero document telemetry, and strict client-side data ownership.",
  tag: "AIR-GAPPED TRUST GUARANTEE",
  h1: "Privacy Policy",
  lead: "Your documents, models, and computational formulas belong exclusively to you. Learn how LDOC Studio guarantees 100% air-gapped autonomy and zero data leakage.",
  summaryBullets: [
    "We collect zero document content, zero AST structures, and zero telemetry from your local files.",
    "Payment transactions are processed securely via verified gateways (Lemon Squeezy / Stripe). We never store raw card numbers.",
    "Local drafts and signing keys are cached strictly in your browser or local device storage."
  ],
  lastUpdated: "October 10, 2026",
  sections: [
    {
      title: "Zero-Telemetry & Air-Gapped Autonomy",
      content: `
        <p>At <strong>J AI ENTERPRISES</strong>, our foundational architectural principle is that <strong>Living Documents (.ldocx) are sovereign files</strong>. Unlike cloud-locked document platforms, LDOC Studio operates entirely client-side inside your browser or native desktop application.</p>
        <div class="highlight-box"><strong>The Air-Gap Guarantee:</strong> LDOC Studio executes zero cloud telemetry on your document contents, AST structures, embedded 3D models (GLB/OBJ), or live JavaScript calculations. When running disconnected or within classified SCIF environments, zero packets egress your local device.</div>
      `
    },
    {
      title: "Information We Collect & Process",
      content: `
        <p>We do not sell, rent, or trade your personal information. The limited categories of data we process include:</p>
        <ul>
          <li><strong>Account Registration:</strong> If you create an account on our cloud portal, we store your email address, hashed password, and user identifier to authenticate you.</li>
          <li><strong>Commercial Transactions:</strong> Payment processing is handled securely by verified gateways. We do not store raw credit card numbers or banking credentials on our servers.</li>
          <li><strong>Enterprise Inquiries:</strong> Contact information submitted via enterprise lead forms is used solely to respond to your inquiry and provide quotes.</li>
          <li><strong>Zero Payload Ingestion:</strong> Your .ldocx packages, presentation slides, code sandboxes, and cryptographic keys are NEVER uploaded to our servers unless you explicitly configure a custom webhook.</li>
        </ul>
      `
    },
    {
      title: "Local Storage & Cryptographic Keys",
      content: `
        <p>LDOC Studio uses standard web storage technologies (<code>localStorage</code>, <code>IndexedDB</code>, and the File System Access API) strictly on your local machine to:</p>
        <ul>
          <li>Cache your working document drafts locally so you never lose work on reload.</li>
          <li>Store your personal ECDSA / Ed25519 public/private keypairs generated via WebCrypto for local document signing.</li>
          <li>Preserve user interface settings, theme preferences, and editor keybindings.</li>
        </ul>
        <p>You can clear this data at any time through your browser settings or by invoking the local reset command in the Studio settings modal.</p>
      `
    },
    {
      title: "GDPR & CCPA Compliance",
      content: `
        <p>In accordance with global data protection laws (GDPR EU 2016/679 and CCPA/CPRA), you have the right to access, rectify, or request permanent deletion of your account metadata. Because document content is stored exclusively on your device, you maintain immediate physical sovereignty over all intellectual property created with LDOC Studio.</p>
      `
    },
    {
      title: "Contact Our Privacy Officer",
      content: `
        <p>If you have any questions or require custom compliance validation for defense, healthcare, or financial air-gapped deployments, contact our founding team directly:</p>
        <ul>
          <li><strong>Entity:</strong> J AI ENTERPRISES</li>
          <li><strong>Founder &amp; Architect:</strong> Jayaraman K</li>
          <li><strong>Direct Email:</strong> <a href="mailto:jayaramankalidasan@gmail.com" style="color:var(--primary-light)">jayaramankalidasan@gmail.com</a></li>
        </ul>
      `
    }
  ]
});

// 3. TERMS
const termsHtml = generateLegalPage({
  title: "Terms of Service & Usage Agreement",
  metaDesc: "Terms of Service for LDOC Studio, Living Document Format (.ldocx), and @ldoc/sdk developer tooling.",
  tag: "TERMS OF SERVICE",
  h1: "Terms of Service",
  lead: "Clear, fair, developer-first usage agreements for LDOC Studio applications, web sandboxes, and commercial software licenses.",
  summaryBullets: [
    "You own 100% of all intellectual property, 3D meshes, and living documents created with LDOC Studio.",
    "Studio Pro licenses are one-time lifetime purchases with zero recurring subscription fees.",
    "The core .ldocx specification is open standard under Apache 2.0."
  ],
  lastUpdated: "October 10, 2026",
  sections: [
    {
      title: "Acceptance of Terms",
      content: `
        <p>By accessing or using LDOC Studio, the <code>@ldoc/sdk</code> package, or downloading the offline workstation suite, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use our applications or commercial distributions.</p>
      `
    },
    {
      title: "License Grants & Software Ownership",
      content: `
        <p><strong>Studio Pro Lifetime License:</strong> A one-time purchase of LDOC Studio Pro grants you a perpetual, non-exclusive, non-transferable workstation license to install and run the software on your personal and commercial workstation devices without recurring royalties.</p>
        <p><strong>Open Specification:</strong> The container format specifications for <code>.ldocx</code>, including JSON AST schemas and manifest definitions, are open standard licensed under Apache 2.0.</p>
      `
    },
    {
      title: "Intellectual Property & User Content",
      content: `
        <p>You retain 100% unrestricted copyright, ownership, and intellectual property rights in all text, 3D CAD models, formulas, and presentations you compile with LDOC Studio. We claim zero ownership or access rights over your sovereign files.</p>
      `
    },
    {
      title: "Limitation of Liability",
      content: `
        <p>LDOC Studio is provided "as is" without warranty of any kind. In no event shall J AI ENTERPRISES or its contributors be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the software.</p>
      `
    }
  ]
});

// 4. REFUND
const refundHtml = generateLegalPage({
  title: "Refund & Cancellation Policy",
  metaDesc: "Official 14-day refund and cancellation policy for LDOC Studio Pro licenses and enterprise clusters.",
  tag: "REFUND & SATISFACTION POLICY",
  h1: "Refund &amp; Cancellation Policy",
  lead: "Transparent, developer-first refund guidelines. Evaluate the full Studio Pro workstation risk-free with a 14-day satisfaction guarantee.",
  summaryBullets: [
    "14-Day Money-Back Guarantee for all LDOC Studio Pro one-time lifetime licenses.",
    "No complex justifications required; email us your receipt Order ID for prompt processing.",
    "Refunds are credited back to your original payment method within 3–5 business days."
  ],
  lastUpdated: "October 10, 2026",
  sections: [
    {
      title: "14-Day Satisfaction Guarantee",
      content: `
        <p>We stand behind the engineering of LDOC Studio Pro. If the offline desktop suite does not fulfill your workflow requirements or perform as expected on your hardware, you are entitled to a full 100% refund within 14 days of your initial purchase.</p>
      `
    },
    {
      title: "How to Request a Refund",
      content: `
        <p>To initiate a refund, simply email our founder directly with your purchase details:</p>
        <div class="highlight-box">
          <strong>Refund Inquiries:</strong> <a href="mailto:jayaramankalidasan@gmail.com" style="color:var(--primary-light)">jayaramankalidasan@gmail.com</a><br>
          Include your receipt Order ID or checkout email address. We process refund requests within 24–48 hours.
        </div>
      `
    },
    {
      title: "Processing Timeline",
      content: `
        <p>Once approved, the refund is automatically dispatched via our merchant of record (Lemon Squeezy / Stripe). Funds will appear on your bank or credit card statement within 3–5 business days depending on your financial institution.</p>
      `
    }
  ]
});

// 5. LICENSE
const licenseHtml = generateLegalPage({
  title: "Commercial License & SLA Agreement",
  metaDesc: "Commercial licensing terms, Enterprise Service Level Agreements, and Apache 2.0 open standard specification for LDOC Studio.",
  tag: "COMMERCIAL SLA & LICENSING",
  h1: "Commercial License &amp; SLA",
  lead: "Dual-licensing standard for LDOC Studio: Open-source specification for researchers and sovereign commercial licensing for engineering enterprises.",
  summaryBullets: [
    "Open Specification: The .ldocx container format and core schemas are free and open under Apache 2.0.",
    "Commercial Rights: Studio Pro and Enterprise Fleet licenses grant full commercial redistribution and deployment rights.",
    "Enterprise SLA: 99.9% uptime commitments for cloud sync relays and dedicated solutions engineering."
  ],
  lastUpdated: "October 10, 2026",
  sections: [
    {
      title: "Dual-License Framework",
      content: `
        <p>LDOC Studio is governed by a transparent dual-license model designed to protect open scientific interoperability while providing industrial guarantees for enterprises:</p>
        <ul>
          <li><strong>The Open Living Document Standard (Apache 2.0):</strong> The file format container (PKWare ZIP), <code>manifest.json</code> schema, and pure arithmetic text measurement architecture are open and unrestricted for independent implementation.</li>
          <li><strong>LDOC Studio Workstation &amp; Cloud (Proprietary Commercial):</strong> The GPU rendering pipeline, visual presentation studio, AI copilot, and enterprise fleet installers are licensed under commercial terms.</li>
        </ul>
      `
    },
    {
      title: "Enterprise Fleet SLA Commitments",
      content: `
        <p>For organizations deploying the Enterprise Fleet cluster ($499/year), J AI ENTERPRISES provides:</p>
        <ul>
          <li><strong>99.9% Uptime SLA:</strong> For optional multi-device cloud relays and collaboration endpoints.</li>
          <li><strong>Silent Fleet Deployment:</strong> MSI installers with Intune/SCCM policy parameters and RPM/Debian packages for automated workstation rollout.</li>
          <li><strong>Custom AST Schemas:</strong> Direct engineering assistance to register proprietary CAD and telemetry schemas into the document DAG compiler.</li>
        </ul>
      `
    },
    {
      title: "Commercial Deployment Contact",
      content: `
        <p>For custom enterprise master service agreements (MSA), corporate invoicing, or vendor onboarding questionnaires:</p>
        <div class="highlight-box">
          <strong>Enterprise Licensing Lead:</strong> Jayaraman K &lt;<a href="mailto:jayaramankalidasan@gmail.com" style="color:var(--primary-light)">jayaramankalidasan@gmail.com</a>&gt;
        </div>
      `
    }
  ]
});

// Write all files
const rootDir = path.join(__dirname, '..');
fs.writeFileSync(path.join(rootDir, 'security.html'), securityHtml, 'utf8');
fs.writeFileSync(path.join(rootDir, 'privacy.html'), privacyHtml, 'utf8');
fs.writeFileSync(path.join(rootDir, 'terms.html'), termsHtml, 'utf8');
fs.writeFileSync(path.join(rootDir, 'refund.html'), refundHtml, 'utf8');
fs.writeFileSync(path.join(rootDir, 'license.html'), licenseHtml, 'utf8');

console.log('Successfully written redesigned legal and security suite (5 files)!');
