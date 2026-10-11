const fs = require('fs');
const path = require('path');

const directBuyUrl = 'https://jay-app.lemonsqueezy.com/checkout/buy/16851c1c-6dfb-4607-bf8b-81c3427594d1';

const homeHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LDOC Studio — The Living Document Standard &amp; Workstation</title>
  <meta name="description" content="Documents that compute, react &amp; evolve. The next-generation .ldocx format with spatial 3D WebGL, reactive AST DAGs, and Merkle SHA-256 cryptographic trust.">
  <link rel="icon" type="image/png" href="/ldoc_logo.png">
  <link rel="shortcut icon" href="/app.ico">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/design-system.css">
  <script defer src="/three.min.js"></script>
  <script defer src="/vanguard-3d-telemetry.js"></script>
  <style>
    /* Page-Specific Hero & Bento Enhancements */
    .hero-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 140px 24px 60px;
      display: flex;
      flex-direction: column;
      align-items: center;
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
      font-size: clamp(40px, 6.5vw, 84px);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.03em;
      margin-bottom: 24px;
      max-width: 960px;
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
      max-width: 740px;
      margin-bottom: 36px;
    }

    .hero-ctas {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 48px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .trust-chips-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 64px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .trust-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: var(--radius-full);
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border);
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: #CBD5E1;
      backdrop-filter: blur(8px);
    }

    .trust-chip span.ok { color: var(--emerald); font-weight: 700; }

    /* Hero Dual Showcase Windows */
    .hero-dual-grid {
      display: grid;
      grid-template-columns: 1.12fr 0.88fr;
      gap: 20px;
      width: 100%;
      max-width: 1380px;
      margin: 0 auto 56px;
      align-items: stretch;
    }

    @media (max-width: 1080px) {
      .hero-dual-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }

    /* macOS Window Frame */
    .macos-app-window {
      width: 100%;
      border-radius: 16px;
      background: #0B0D14;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 32px 80px -16px rgba(0, 0, 0, 0.9), 0 0 50px -10px rgba(245, 158, 11, 0.15);
      overflow: hidden;
      position: relative;
    }

    .macos-titlebar {
      height: 44px;
      background: #0E101A;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      position: relative;
      box-sizing: border-box;
    }

    .macos-traffic-lights {
      display: flex;
      gap: 7px;
    }

    .macos-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .dot-red { background: #FF5F56; }
    .dot-yellow { background: #FFBD2E; }
    .dot-green { background: #27C93F; }

    .macos-window-title {
      font-size: 12px;
      font-family: var(--font-mono);
      color: #94A3B8;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .macos-titlebar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hud-mode-pill {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      color: #94A3B8;
      font-size: 11.5px;
      font-family: var(--font-mono);
      padding: 4px 11px;
      border-radius: var(--radius-full);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .hud-mode-pill:hover, .hud-mode-pill.active {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.4);
      color: #FBBF24;
    }

    .hud-pill {
      background: rgba(14, 16, 26, 0.82);
      border: 1px solid var(--border);
      color: #94A3B8;
      font-size: 11px;
      font-family: var(--font-mono);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      backdrop-filter: blur(8px);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .hud-pill:hover {
      color: #FFF;
      border-color: rgba(255, 255, 255, 0.25);
    }

    .vanguard-stage {
      height: 520px;
      position: relative;
      background: radial-gradient(circle at 50% 40%, #151828 0%, #08090D 90%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    @media (max-width: 1200px) {
      .macos-window-title { display: none !important; }
    }

    @media (max-width: 768px) {
      .macos-titlebar { padding: 0 10px; }
      .vanguard-stage { height: 420px; }
      .ldoc-floating-stat {
        padding: 6px 10px !important;
        transform: scale(0.85);
        transform-origin: top left;
      }
      .stat-bob-2 {
        transform-origin: top right !important;
      }
      .stat-bob-3 {
        transform: translateX(-50%) scale(0.85) !important;
      }
    }

    /* Section Wrappers */
    .section-wrap {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 100px 24px;
      position: relative;
      z-index: 10;
    }

    .section-header {
      text-align: center;
      margin-bottom: 64px;
    }

    .section-tag {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 12px;
      display: inline-block;
    }

    .section-h2 {
      font-family: var(--font-display);
      font-size: clamp(32px, 4.5vw, 54px);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 16px;
      color: #FFFFFF;
    }

    .section-sub {
      font-size: 17px;
      color: var(--muted);
      max-width: 660px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* Bento Card Content */
    .bento-card {
      padding: 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      min-height: 280px;
      box-sizing: border-box;
    }

    .bento-icon-tile {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-sm);
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-light);
      margin-bottom: 24px;
    }

    .bento-card h3 {
      font-family: var(--font-display);
      font-size: 21px;
      font-weight: 700;
      color: #FFFFFF;
      margin-bottom: 10px;
    }

    .bento-card p {
      color: var(--muted);
      font-size: 14.5px;
      line-height: 1.6;
    }

    /* IDE Mock */
    .ldoc-ide-mock {
      border-radius: 12px;
      background: #0B0C12;
      border: 1px solid var(--border);
      overflow: hidden;
      display: grid;
      grid-template-columns: 280px 1fr;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }

    .ldoc-ide-tree {
      border-right: 1px solid var(--border);
      background: #08090E;
      padding: 20px 16px;
    }

    .ide-tree-item {
      padding: 8px 12px;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 12px;
      cursor: pointer;
      color: #94A3B8;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ide-tree-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #FFF;
    }

    @media (max-width: 768px) {
      .ldoc-ide-mock { grid-template-columns: 1fr; }
      .ldoc-ide-tree { border-right: none; border-bottom: 1px solid var(--border); }
    }
  </style>
</head>
<body>

  <!-- Floating Pill Navbar -->
  <nav class="ldoc-navbar">
    <div class="ldoc-navbar-inner">
      <a href="/" class="ldoc-nav-logo">
        <img src="/ldoc_logo.png" alt="LDOC Studio" />
        <span>LDOC STUDIO</span>
      </a>

      <div class="ldoc-nav-links">
        <a href="/features" class="ldoc-nav-link">Features</a>
        <a href="/format" class="ldoc-nav-link">Format Spec</a>
        <a href="/models" class="ldoc-nav-link">Blueprints</a>
        <a href="/pricing" class="ldoc-nav-link">Pricing</a>
        <a href="/docs" class="ldoc-nav-link">Docs</a>
      </div>

      <div class="ldoc-nav-right">
        <button class="ldoc-nav-search-btn" onclick="openCmdPalette()" title="Command Palette (Ctrl+K)">
          <span>Search documentation...</span>
          <span class="cmd-badge">⌘K</span>
        </button>
        <a href="/live-studio" class="ldoc-btn-primary" style="padding: 7px 16px; font-size: 13px;">
          <span>Launch Studio &rarr;</span>
        </a>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <main>
    <section class="hero-container">
      <div class="hero-eyebrow ldoc-reveal" data-delay="0ms">
        <span class="pulse-dot"></span>
        <span>OPEN LIVING DOCUMENT STANDARD v2.5.0</span>
      </div>

      <h1 class="hero-h1 ldoc-reveal" data-delay="80ms">
        Documents that <span class="amber-gradient">compute, react</span>, and evolve in real-time.
      </h1>

      <p class="hero-lead ldoc-reveal" data-delay="160ms">
        LDOC Studio replaces static 1993 PDF architecture with spatial 3D WebGL, topological formula AST graphs, and Pretext arithmetic typography. Bit-for-bit identical layout across every surface.
      </p>

      <div class="hero-ctas ldoc-reveal" data-delay="200ms">
        <a href="/live-studio" class="ldoc-btn-primary" style="padding: 12px 28px; font-size: 15px;">
          <span>Launch Web Studio &rarr;</span>
        </a>
        <a href="${directBuyUrl}" target="_blank" class="ldoc-btn-ghost" style="padding: 12px 24px; font-size: 15px;">
          <span>Buy Pro Lifetime ($19)</span>
        </a>
        <a href="/format" class="ldoc-btn-ghost" style="padding: 12px 24px; font-size: 15px;">
          <span>Explore Format Spec</span>
        </a>
      </div>

      <!-- Trust Chips -->
      <div class="trust-chips-row ldoc-reveal" data-delay="240ms">
        <div class="trust-chip"><span class="ok">✓</span> AIR-GAP SOVEREIGNTY</div>
        <div class="trust-chip"><span class="ok">✓</span> PRETEXT ARITHMETIC (0 DRIFT)</div>
        <div class="trust-chip"><span class="ok">✓</span> MERKLE SHA-256 TRUST</div>
        <div class="trust-chip"><span class="ok">✓</span> DISCRETE 120Hz GPU PIPELINE</div>
      </div>

      <!-- Hero Dual-Window Showcase (Interactive 3D WebGL Telemetry + Active 4K Engine Video Side-by-Side) -->
      <div class="hero-dual-grid ldoc-reveal" data-delay="300ms">

        <!-- Window 1: Interactive 3D WebGL Multi-Model Telemetry -->
        <div class="macos-app-window ldoc-tilt-card">
          <div class="macos-titlebar">
            <div class="macos-traffic-lights">
              <div class="macos-dot dot-red"></div>
              <div class="macos-dot dot-yellow"></div>
              <div class="macos-dot dot-green"></div>
            </div>
            <div class="macos-window-title">
              <span id="hero-3d-title-text">vanguard-7-telemetry.ldocx — 3D CAD</span>
            </div>
            <div class="macos-titlebar-right">
              <button id="hero-model-btn-vanguard" class="hud-mode-pill active" onclick="switchHero3DModel('vanguard')">
                <span>🤖 Vanguard-7</span>
              </button>
              <button id="hero-model-btn-satellite" class="hud-mode-pill" onclick="switchHero3DModel('satellite')">
                <span>🛰️ Satellite</span>
              </button>
              <button id="hero-model-btn-quantum" class="hud-mode-pill" onclick="switchHero3DModel('quantum')">
                <span>💎 Quantum</span>
              </button>
              <button id="hero-model-btn-tourbillon" class="hud-mode-pill" onclick="switchHero3DModel('tourbillon')">
                <span>⚙️ Tourbillon</span>
              </button>
              <a href="/vanguard-7-telemetry.ldocx" download="vanguard-7-telemetry.ldocx" class="hud-mode-pill" title="Download .ldocx package">
                <span>💾 .ldocx</span>
              </a>
            </div>
          </div>

          <div class="vanguard-stage" id="hero-vanguard-stage" style="height: 520px;">
            <!-- 3D Real WebGL Canvas -->
            <canvas id="hero-real-3d-canvas" style="width: 100%; height: 100%; position: absolute; inset: 0; display: block; z-index: 5;"></canvas>

            <!-- Top HUD Overlay -->
            <div id="hero-hud-top" style="position: absolute; top: 14px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; pointer-events: none; z-index: 15;">
              <span class="hud-pill"><span class="pulse-dot"></span> 120Hz Hardware WebGL Compositor</span>
              <div style="display: flex; gap: 8px; pointer-events: auto;">
                <button class="hud-pill" id="hero-wireframe-btn" onclick="toggleHeroWireframe()">Wireframe</button>
                <button class="hud-pill" id="hero-orbit-btn" onclick="toggleHeroAutoOrbit()">Pause Orbit</button>
              </div>
            </div>

            <!-- Floating Glass Telemetry Stat Badges -->
            <div class="ldoc-floating-stat stat-bob-1" style="top: 56px; left: 16px; z-index: 12;">
              <div style="font-size: 16px; color: var(--accent);">⚡</div>
              <div>
                <div style="font-size: 9.5px; color: var(--muted); text-transform: uppercase;">Aero Torque</div>
                <div style="font-size: 15px; font-weight: 700; color: #FFF; font-family: var(--font-mono)" id="floating-torque-val">340 Nm</div>
              </div>
            </div>

            <div class="ldoc-floating-stat stat-bob-2" style="top: 56px; right: 16px; z-index: 12;">
              <div style="font-size: 16px; color: var(--accent-2);">🌡️</div>
              <div>
                <div style="font-size: 9.5px; color: var(--muted); text-transform: uppercase;">Core Temp</div>
                <div style="font-size: 15px; font-weight: 700; color: #FFF; font-family: var(--font-mono)" id="floating-temp-val">+42.8 °C</div>
              </div>
            </div>

            <div class="ldoc-floating-stat stat-bob-3" style="bottom: 74px; left: 50%; transform: translateX(-50%); z-index: 12;">
              <div style="font-size: 16px; color: var(--emerald);">🔒</div>
              <div>
                <div style="font-size: 9.5px; color: var(--muted); text-transform: uppercase;">Cryptographic Integrity</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--emerald); font-family: var(--font-mono)" id="floating-integrity-val">98.4% Verified Root</div>
              </div>
            </div>

            <!-- Bottom HUD Telemetry Console -->
            <div id="hero-hud-bottom" style="position: absolute; bottom: 12px; left: 14px; right: 14px; display: flex; justify-content: space-between; align-items: center; z-index: 15; background: rgba(14, 16, 26, 0.85); backdrop-filter: blur(10px); border: 1px solid var(--border); padding: 7px 14px; border-radius: 10px; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 11px; font-family: var(--font-mono); color: #94A3B8; text-transform: uppercase;">Joint Load:</span>
                <input type="range" id="hero-actuator-slider" min="50" max="600" step="10" value="340" style="width: 120px; accent-color: var(--accent); cursor: pointer;" oninput="updateHeroFormula(this.value)">
                <span id="hero-actuator-val" style="font-size: 12px; font-family: var(--font-mono); font-weight: 700; color: var(--accent);">340 Nm</span>
              </div>
              <span class="hud-hint" style="font-size: 10.5px; color: #64748B; font-family: var(--font-mono);">Drag to rotate 360° • Scroll zoom</span>
            </div>
          </div>
        </div>

        <!-- Window 2: Living Document 4K Engine Video Stream (Playing Side-by-Side!) -->
        <div class="macos-app-window ldoc-tilt-card">
          <div class="macos-titlebar">
            <div class="macos-traffic-lights">
              <div class="macos-dot dot-red"></div>
              <div class="macos-dot dot-yellow"></div>
              <div class="macos-dot dot-green"></div>
            </div>
            <div class="macos-window-title">
              <span>vanguard-7-mission-footage.mp4 — 4K Stream</span>
            </div>
            <div class="macos-titlebar-right">
              <span class="hud-mode-pill" style="border-color: rgba(34, 197, 94, 0.4); color: #4ADE80; background: rgba(34, 197, 94, 0.1);">
                <span class="pulse-dot" style="background: #22C55E; box-shadow: 0 0 8px #22C55E;"></span>
                <span>LIVE 120 FPS</span>
              </span>
              <button class="hud-mode-pill" id="hero-video-audio-toggle" onclick="toggleHeroVideoAudio()">
                <span id="hero-audio-icon">🔇</span> <span id="hero-audio-label">Unmute</span>
              </button>
              <a href="/live-studio" class="hud-mode-pill" title="Launch Studio">
                <span>Studio &rarr;</span>
              </a>
            </div>
          </div>

          <div class="vanguard-stage hero-video-stage" style="height: 520px; position: relative; background: #000; overflow: hidden;">
            <!-- Active 4K Autoplaying Video -->
            <video id="hero-side-video" src="/upscaled-videoad2.mp4" autoplay loop muted playsinline poster="/video-poster.webp" style="width: 100%; height: 100%; object-fit: cover; display: block; position: absolute; inset: 0; z-index: 5;"></video>

            <!-- Gradient Vignette -->
            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8,10,16,0.55) 0%, transparent 22%, transparent 72%, rgba(8,10,16,0.8) 100%); pointer-events: none; z-index: 8;"></div>

            <!-- Top Video HUD -->
            <div style="position: absolute; top: 14px; left: 16px; right: 16px; display: flex; justify-content: space-between; align-items: center; pointer-events: none; z-index: 15;">
              <span class="hud-pill"><span class="pulse-dot"></span> Dual-Surface Synchronized View</span>
              <span class="hud-pill" style="font-size: 10px;">CAM 01 // 4K UHD</span>
            </div>

            <!-- Floating Engine Feature Badge -->
            <div class="ldoc-floating-stat" style="bottom: 74px; left: 18px; z-index: 12; padding: 8px 14px;">
              <div style="font-size: 16px; color: var(--accent);">⚡</div>
              <div>
                <div style="font-size: 9.5px; color: var(--muted); text-transform: uppercase;">Pretext Engine</div>
                <div style="font-size: 13px; font-weight: 700; color: #FFF; font-family: var(--font-mono)">Zero Reflow Geometry</div>
              </div>
            </div>

            <!-- Bottom Video Controls Console -->
            <div style="position: absolute; bottom: 12px; left: 14px; right: 14px; display: flex; justify-content: space-between; align-items: center; z-index: 15; background: rgba(14, 16, 26, 0.85); backdrop-filter: blur(10px); border: 1px solid var(--border); padding: 7px 14px; border-radius: 10px; box-sizing: border-box;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <button class="hud-pill" id="hero-video-play-btn" onclick="toggleHeroVideoPlay()" style="padding: 4px 10px;">
                  <span id="hero-play-icon">⏸</span> <span id="hero-play-label">Pause</span>
                </button>
                <span style="font-size: 11px; font-family: var(--font-mono); color: #94A3B8;">Workstation Living Canvas Demo</span>
              </div>
              <button class="hud-pill" onclick="expandHeroVideoFullscreen()" title="Fullscreen" style="padding: 4px 8px;">⛶ Fullscreen</button>
            </div>
          </div>
        </div>

      </div>

      <!-- Infinite Logo / Spec-Chip Marquee -->
      <div class="ldoc-marquee-container">
        <div class="ldoc-marquee-track">
          <div class="ldoc-marquee-chip"><span>01</span> AIR-GAP ISOLATION</div>
          <div class="ldoc-marquee-chip"><span>02</span> PRETEXT ARITHMETIC</div>
          <div class="ldoc-marquee-chip"><span>03</span> MERKLE SHA-256</div>
          <div class="ldoc-marquee-chip"><span>04</span> DRACO MESH COMPRESSION</div>
          <div class="ldoc-marquee-chip"><span>05</span> WEBGL 2.0 THREE.JS</div>
          <div class="ldoc-marquee-chip"><span>06</span> REACTIVE FORMULA DAG</div>
          <div class="ldoc-marquee-chip"><span>07</span> ZERO BROWSER TELEMETRY</div>
          <div class="ldoc-marquee-chip"><span>08</span> ED25519 DIGITAL SIGNING</div>
          <!-- Repeat for infinite seamless track -->
          <div class="ldoc-marquee-chip"><span>01</span> AIR-GAP ISOLATION</div>
          <div class="ldoc-marquee-chip"><span>02</span> PRETEXT ARITHMETIC</div>
          <div class="ldoc-marquee-chip"><span>03</span> MERKLE SHA-256</div>
          <div class="ldoc-marquee-chip"><span>04</span> DRACO MESH COMPRESSION</div>
          <div class="ldoc-marquee-chip"><span>05</span> WEBGL 2.0 THREE.JS</div>
          <div class="ldoc-marquee-chip"><span>06</span> REACTIVE FORMULA DAG</div>
          <div class="ldoc-marquee-chip"><span>07</span> ZERO BROWSER TELEMETRY</div>
          <div class="ldoc-marquee-chip"><span>08</span> ED25519 DIGITAL SIGNING</div>
        </div>
      </div>
    </section>

    <hr class="ldoc-section-divider" />

    <!-- 1. CORE CAPABILITIES (BENTO GRID) -->
    <section class="section-wrap" id="capabilities">
      <div class="section-header ldoc-reveal">
        <span class="section-tag">ENGINE ARCHITECTURE</span>
        <h2 class="section-h2">Engineered for Mathematical Certainty</h2>
        <p class="section-sub">Eliminate 30 years of PDF stagnation. LDOC brings reactive computation and 3D spatial geometry to sovereign files.</p>
      </div>

      <div class="ldoc-bento-grid">
        <!-- Card 1: 3D Spatial (Col 8) with Live 3D WebGL Canvas -->
        <div class="bento-col-8 ldoc-reveal" data-delay="60ms">
          <div class="ldoc-spotlight-card bento-card" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 260px;">
              <div class="bento-icon-tile">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <h3>Discrete GPU Spatial 3D Pipeline</h3>
              <p>Embed full GLTF/GLB CAD models and Draco compressed meshes directly inside document pages. Orbit, inspect materials, and compute aerodynamic clearances in real-time at 120 FPS.</p>
              <div style="margin-top: 18px; padding: 10px 14px; border-radius: 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--border); font-family: var(--font-mono); font-size: 11.5px; color: var(--accent-light); display: inline-block;">
                ✓ glTF 2.0 • Draco Compression • Zero Cloud Streaming
              </div>
            </div>
            <div style="width: 180px; height: 180px; position: relative; border-radius: 12px; background: #0A0D17; border: 1px solid var(--border); overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <canvas id="bento-3d-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
              <div style="position: absolute; bottom: 6px; left: 8px; font-size: 9.5px; font-family: var(--font-mono); color: #38bdf8; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px;">
                120Hz WebGL
              </div>
            </div>
          </div>
        </div>

        <!-- Card 2: Zero Drift Pretext (Col 4) -->
        <div class="bento-col-4 ldoc-reveal" data-delay="120ms">
          <div class="ldoc-spotlight-card bento-card">
            <div>
              <div class="bento-icon-tile">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
              </div>
              <h3>Pretext Zero-Drift Typography</h3>
              <p>Pure arithmetic text measurement computed in offscreen canvas. 100% bit-for-bit identical line breaks across Editor, Viewer, and headless PDF flattener.</p>
            </div>
            <div style="font-family: var(--font-mono); font-size: 12px; color: var(--emerald);">
              ✓ 25/25 Parity Conformance Passed
            </div>
          </div>
        </div>

        <!-- Card 3: Reactive DAG (Col 4) -->
        <div class="bento-col-4 ldoc-reveal" data-delay="180ms">
          <div class="ldoc-spotlight-card bento-card">
            <div>
              <div class="bento-icon-tile">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
              </div>
              <h3>Reactive Formula AST DAG</h3>
              <p>Formulas compute in strict topological order in &lt;0.2ms. Sliders dynamically update financial projections and physics telemetry without page reload.</p>
            </div>
            <div style="font-family: var(--font-mono); font-size: 12px; color: var(--accent-2);">
              ✓ Sub-millisecond DAG Recalculation
            </div>
          </div>
        </div>

        <!-- Card 4: Cryptographic Trust (Col 8) -->
        <div class="bento-col-8 ldoc-reveal" data-delay="240ms">
          <div class="ldoc-spotlight-card bento-card">
            <div>
              <div class="bento-icon-tile">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3>Cryptographic Merkle SHA-256 Provenance</h3>
              <p>Every block, mesh node, and telemetry row is digested into a SHA-256 Merkle tree signed with Ed25519 root keys. Local integrity verification raises an alarm in &lt;15ms if even one character is altered.</p>
            </div>
            <div style="margin-top: 24px; padding: 16px; border-radius: 8px; background: rgba(0,0,0,0.4); border: 1px solid var(--border); font-family: var(--font-mono); font-size: 12px; color: var(--emerald);">
              Root Digest: cf5e973d96c1f2eebbf1f6e31a2cec3ab3293ece187e984e4273d086560e203d (Verified)
            </div>
          </div>
        </div>
      </div>
    </section>

    <hr class="ldoc-section-divider" />

    <!-- 2. INSIDE THE .LDOCX FORMAT (TWO-PANE IDE MOCK) -->
    <section class="section-wrap" id="format">
      <div class="section-header ldoc-reveal">
        <span class="section-tag">OPEN CONTAINER STANDARD</span>
        <h2 class="section-h2">Inside the .ldocx Container</h2>
        <p class="section-sub">Standard PKWare ZIP archive holding structured JSON AST schemas, binary 3D assets, and 20-year archival fallback HTML.</p>
      </div>

      <div class="ldoc-ide-mock ldoc-reveal">
        <!-- Tree Left -->
        <div class="ldoc-ide-tree">
          <div style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 8px;">Archive Structure</div>
          <div class="ide-tree-item" id="ide-item-ast" onclick="selectIdeFile('ast', this)" style="background: rgba(245,158,11,0.15); color: #FFF;">📄 document.ast.json</div>
          <div class="ide-tree-item" id="ide-item-model" onclick="selectIdeFile('model', this)" style="color: var(--accent-light);">🧊 models/telemetry.glb</div>
          <div class="ide-tree-item" id="ide-item-manifest" onclick="selectIdeFile('manifest', this)">📄 manifest.json</div>
          <div class="ide-tree-item" id="ide-item-sig" onclick="selectIdeFile('sig', this)" style="color: var(--emerald);">🔒 signatures/ed25519.sig</div>
          <div class="ide-tree-item" id="ide-item-fallback" onclick="selectIdeFile('fallback', this)" style="color: #64748B;">📄 fallback.html</div>
        </div>

        <!-- Code / 3D Right -->
        <div class="ldoc-ide-editor">
          <div style="display: flex; border-bottom: 1px solid var(--border); padding: 0 16px; background: #0B0C12;">
            <div id="ide-tab-label" style="padding: 10px 16px; border-bottom: 2px solid var(--accent); color: #FFF; font-size: 12px; font-family: var(--font-mono);">document.ast.json</div>
            <div id="ide-sub-label" style="padding: 10px 16px; color: #64748B; font-size: 12px; font-family: var(--font-mono);">JSON AST Hierarchy</div>
          </div>
          <div id="ide-code-view" style="display: block;">
            <pre style="padding: 24px; font-family: var(--font-mono); font-size: 13px; color: #A5B4FC; overflow-x: auto; line-height: 1.6; margin: 0;"><code id="ide-code-content">{
  "$schema": "https://ldoc.io/spec/v2.5.0/document.schema.json",
  "version": "2.5.0",
  "meta": {
    "title": "Vanguard-7 Hypercar & Robotics Telemetry",
    "author": "Autonomous Dynamics Lab",
    "merkleRoot": "cf5e973d96c1f2eebbf1f6e31a2cec3ab3293ece187e984e4273d086560e203d"
  },
  "blocks": [
    {
      "id": "block-01",
      "type": "heading",
      "level": 1,
      "text": "Telemetry Specification"
    },
    {
      "id": "block-02",
      "type": "3d_model",
      "asset": "models/telemetry.glb",
      "actuatorTorque": 340,
      "interactive": true
    }
  ]
}</code></pre>
          </div>
          <div id="ide-3d-view" style="display: none; height: 320px; position: relative; background: #080A10; align-items: center; justify-content: center;">
            <canvas id="ide-mini-3d-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
            <div style="position: absolute; bottom: 12px; left: 16px; font-size: 11px; font-family: var(--font-mono); color: #38bdf8; background: rgba(0,0,0,0.6); padding: 4px 10px; border-radius: 6px;">
              ✓ glTF 2.0 Binary Mesh • 60 FPS Orbit Active
            </div>
          </div>
        </div>
      </div>
    </section>

    <hr class="ldoc-section-divider" />

    <!-- 3. BENCHMARK MATRIX -->
    <section class="section-wrap" id="benchmark">
      <div class="section-header ldoc-reveal">
        <span class="section-tag">COMPETITIVE ARCHITECTURE</span>
        <h2 class="section-h2">Why PDF &amp; DOCX Fail Modern Computing</h2>
        <p class="section-sub">Documents must run as sovereign code. Here is how LDOC surpasses legacy formats on every metric.</p>
      </div>

      <div class="ldoc-table-container ldoc-reveal">
        <table class="ldoc-table">
          <thead>
            <tr>
              <th>Capability &amp; Invariant</th>
              <th class="col-highlight">LDOC (.ldocx)</th>
              <th>Adobe PDF</th>
              <th>Microsoft DOCX</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="feature-name">Cross-Surface Layout Drift</td>
              <td class="col-highlight ok">0.00px (Bit-for-Bit Pretext)</td>
              <td class="bad">Static Fixed Grid (Unreflowable)</td>
              <td class="bad">High Reflow Drift (Printer Dependent)</td>
            </tr>
            <tr>
              <td class="feature-name">Embedded 3D Spatial Models</td>
              <td class="col-highlight ok">Native 120Hz WebGL &amp; Draco</td>
              <td class="bad">Deprecated U3D / Insecure Plugins</td>
              <td class="bad">Flat 2D Raster Screenshots</td>
            </tr>
            <tr>
              <td class="feature-name">Topological Reactive DAG</td>
              <td class="col-highlight ok">Sub-millisecond Reactive AST</td>
              <td class="bad">Static Text Only</td>
              <td class="bad">Unsafe Macros / Broken Sandboxing</td>
            </tr>
            <tr>
              <td class="feature-name">Cryptographic Provenance</td>
              <td class="col-highlight ok">RFC 6962 Merkle SHA-256 + Ed25519</td>
              <td class="warn">Fragile X.509 Adobe Certs</td>
              <td class="bad">Easily Tampered XML Without Trace</td>
            </tr>
            <tr>
              <td class="feature-name">Air-Gapped Sovereign Execution</td>
              <td class="col-highlight ok">100% Offline (Zero Network Calls)</td>
              <td class="warn">Calls Home for Cloud Fonts</td>
              <td class="bad">Office 365 Cloud Dependent</td>
            </tr>
            <tr>
              <td class="feature-name">20-Year Archival Longevity</td>
              <td class="col-highlight ok">Self-Contained fallback.html</td>
              <td class="warn">Requires Proprietary PDF Viewers</td>
              <td class="bad">Format Version Drift &amp; Deprecation</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <hr class="ldoc-section-divider" />

    <!-- 4. TRANSPARENT PRICING CARDS -->
    <section class="section-wrap" id="pricing">
      <div class="section-header ldoc-reveal">
        <span class="section-tag">PREDICTABLE WORKSTATION LICENSING</span>
        <h2 class="section-h2">One Fair Price. Perpetual Ownership.</h2>
        <p class="section-sub">No forced subscription fees. Run forever on your local workstation with air-gapped sovereignty.</p>
      </div>

      <div class="pricing-cards-grid">
        <!-- Community Tier -->
        <div class="pricing-card ldoc-reveal" data-delay="60ms">
          <span class="plan-name">Community Free</span>
          <div class="plan-price">$0</div>
          <div class="plan-period">Free forever for personal use</div>
          <p class="plan-desc">Full access to the web editor, local .ldocx parsing, and Pretext layout inspection.</p>
          <ul class="plan-features">
            <li><span>✓</span> Full Browser Web Studio Access</li>
            <li><span>✓</span> Core .ldocx Reader &amp; Exporter</li>
            <li><span>✓</span> 25/25 Zero-Drift Pretext Engine</li>
            <li><span>✓</span> Merkle SHA-256 Integrity Verification</li>
          </ul>
          <a href="/live-studio" class="ldoc-btn-ghost" style="text-align: center; justify-content: center;">Launch Web Demo</a>
        </div>

        <!-- Studio Pro Tier (Featured) -->
        <div class="pricing-card featured ldoc-reveal" data-delay="120ms">
          <div class="plan-tag">MOST POPULAR • LIFETIME OWNERSHIP</div>
          <span class="plan-name">Studio Pro Workstation</span>
          <div class="plan-price">$19</div>
          <div class="plan-period">One-time payment • Lifetime license</div>
          <p class="plan-desc">Standalone desktop suite for Windows, macOS, and Linux. Unlimited air-gapped living document authoring.</p>
          <ul class="plan-features">
            <li><span>✓</span> Perpetual Local Desktop License</li>
            <li><span>✓</span> Discrete 120Hz GPU 3D Mesh Acceleration</li>
            <li><span>✓</span> Unlimited Multi-Slide &amp; Document Output</li>
            <li><span>✓</span> Headless CLI PDF Flattener Included</li>
            <li><span>✓</span> Ed25519 Cryptographic Document Signing</li>
            <li><span>✓</span> Commercial Apache-2.0 Royalty-Free</li>
          </ul>
          <a href="${directBuyUrl}" target="_blank" class="ldoc-btn-primary" style="text-align: center; justify-content: center; width: 100%; box-sizing: border-box;">Buy Pro Lifetime ($19)</a>
        </div>

        <!-- Enterprise Fleet Tier -->
        <div class="pricing-card ldoc-reveal" data-delay="180ms">
          <span class="plan-name">Enterprise Fleet</span>
          <div class="plan-price">$499</div>
          <div class="plan-period">Per organization / year</div>
          <p class="plan-desc">For defense, aerospace, financial engineering, and automated documentation pipelines.</p>
          <ul class="plan-features">
            <li><span>✓</span> Unlimited Seat Organization License</li>
            <li><span>✓</span> Headless Server-Side Rendering SDK</li>
            <li><span>✓</span> Custom Merkle Hardware Enclave HSM Signer</li>
            <li><span>✓</span> Air-gapped SCIF Deployment Packages</li>
            <li><span>✓</span> Dedicated Solutions Engineering</li>
          </ul>
          <a href="mailto:jayaramankalidasan@gmail.com" class="ldoc-btn-ghost" style="text-align: center; justify-content: center;">Contact Enterprise</a>
        </div>
      </div>
    </section>

    <hr class="ldoc-section-divider" />

    <!-- 5. SEARCHABLE ACCORDION FAQ -->
    <section class="section-wrap" id="faq">
      <div class="section-header ldoc-reveal">
        <span class="section-tag">FREQUENTLY ASKED QUESTIONS</span>
        <h2 class="section-h2">Common Questions &amp; Direct Answers</h2>
      </div>

      <div class="faq-list">
        <div class="faq-item ldoc-reveal active">
          <div class="faq-q" onclick="toggleFaq(this)">
            <span>How does .ldocx differ fundamentally from a PDF file?</span>
            <span>+</span>
          </div>
          <div class="faq-a">
            PDF was designed in 1993 for printer paper output. It uses static postscript glyph coordinates without reflow capability. .ldocx files are living software containers holding a reactive AST, 3D spatial models, and Pretext arithmetic typography that adapts dynamically while guaranteeing bit-for-bit text layout consistency.
          </div>
        </div>

        <div class="faq-item ldoc-reveal">
          <div class="faq-q" onclick="toggleFaq(this)">
            <span>Can LDOC Studio run completely disconnected in air-gapped SCIF environments?</span>
            <span>+</span>
          </div>
          <div class="faq-a">
            Yes. LDOC Studio is 100% self-contained. All WebGL shaders, Three.js runtimes, Math engines, and Pretext layout metrics are bundled locally. Zero external network requests are made, guaranteeing compliance with military, banking, and confidential R&amp;D requirements.
          </div>
        </div>

        <div class="faq-item ldoc-reveal">
          <div class="faq-q" onclick="toggleFaq(this)">
            <span>Is the Studio Pro license a recurring monthly fee?</span>
            <span>+</span>
          </div>
          <div class="faq-a">
            No. LDOC Studio Pro is a one-time $19 purchase for a perpetual, lifetime workstation license with zero recurring subscription charges.
          </div>
        </div>

        <div class="faq-item ldoc-reveal">
          <div class="faq-q" onclick="toggleFaq(this)">
            <span>How does Merkle cryptographic verification work?</span>
            <span>+</span>
          </div>
          <div class="faq-a">
            Every block, paragraph, and 3D mesh is hashed into a SHA-256 Merkle tree signed with the author's Ed25519 digital key. Opening a document validates the entire tree in &lt;15ms. If even a single byte or CAD vertex has been tampered with, an instant alarm is triggered.
          </div>
        </div>
      </div>
    </section>

    <!-- 6. FINAL FULL-WIDTH CTA -->
    <section style="background: radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.12) 0%, rgba(14, 14, 21, 0.95) 100%); border-top: 1px solid var(--border); padding: 120px 24px; text-align: center; position: relative; z-index: 10;">
      <div style="max-width: 720px; margin: 0 auto;" class="ldoc-reveal">
        <span class="section-tag">SOVEREIGN WORKSTATION</span>
        <h2 class="section-h2" style="font-size: clamp(36px, 5vw, 60px);">Start authoring living documents today.</h2>
        <p class="section-sub" style="margin-bottom: 40px;">Download the standalone desktop suite or launch the full browser IDE immediately.</p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="/live-studio" class="ldoc-btn-primary" style="padding: 14px 32px; font-size: 15px;">Launch Web Studio &rarr;</a>
          <a href="${directBuyUrl}" target="_blank" class="ldoc-btn-ghost" style="padding: 14px 28px; font-size: 15px;">Buy Pro Lifetime ($19)</a>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="footer-wrap">
    <div class="footer-grid">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-weight: 700; color: #FFF; margin-bottom: 12px;">
          <img src="/ldoc_logo.png" style="width: 22px; height: 22px; border-radius: 4px;" alt="Logo" />
          <span>LDOC STUDIO</span>
        </div>
        <p style="font-size: 13.5px; color: var(--muted); line-height: 1.6; max-width: 320px;">
          The Next-Generation Living Document Architecture &amp; Studio. Designed by J AI ENTERPRISES. Open Living Document Standard.
        </p>
      </div>

      <div>
        <div style="font-size: 12px; font-weight: 700; color: #FFF; text-transform: uppercase; margin-bottom: 16px; font-family: var(--font-mono)">Product</div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
          <a href="/live-studio" style="color: var(--muted); text-decoration: none;">Live Studio</a>
          <a href="/creator" style="color: var(--muted); text-decoration: none;">Visual Creator</a>
          <a href="/models" style="color: var(--muted); text-decoration: none;">Models Hub</a>
          <a href="/pricing" style="color: var(--muted); text-decoration: none;">Pricing</a>
        </div>
      </div>

      <div>
        <div style="font-size: 12px; font-weight: 700; color: #FFF; text-transform: uppercase; margin-bottom: 16px; font-family: var(--font-mono)">Developers</div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
          <a href="/format" style="color: var(--muted); text-decoration: none;">Format Specification</a>
          <a href="/docs" style="color: var(--muted); text-decoration: none;">Documentation &amp; SDK</a>
          <a href="/changelog" style="color: var(--muted); text-decoration: none;">Changelog</a>
          <a href="https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT" target="_blank" style="color: var(--muted); text-decoration: none;">GitHub Repository</a>
        </div>
      </div>

      <div>
        <div style="font-size: 12px; font-weight: 700; color: #FFF; text-transform: uppercase; margin-bottom: 16px; font-family: var(--font-mono)">Trust &amp; Legal</div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
          <a href="/security" style="color: var(--muted); text-decoration: none;">Security Architecture</a>
          <a href="/privacy" style="color: var(--muted); text-decoration: none;">Privacy Policy</a>
          <a href="/terms" style="color: var(--muted); text-decoration: none;">Terms of Service</a>
          <a href="/refund" style="color: var(--muted); text-decoration: none;">Refund Policy</a>
          <a href="/license" style="color: var(--muted); text-decoration: none;">Commercial SLA</a>
        </div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--dim); border-top: 1px solid var(--border); padding-top: 24px; flex-wrap: wrap; gap: 12px;">
      <div>&copy; 2026 LDOC Studio. All rights reserved. Sovereign living document architecture.</div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--emerald);"></span>
        <span>All systems operational (v2.5.0)</span>
      </div>
    </div>
  </footer>

  <script src="/design-system.js"></script>
  <script>
    function toggleFaq(el) {
      const item = el.closest('.faq-item');
      item.classList.toggle('active');
      const icon = el.querySelector('span:last-child');
      if (icon) icon.textContent = item.classList.contains('active') ? '✕' : '+';
    }

    // Initialize Bento Grid 3D Preview
    document.addEventListener('DOMContentLoaded', () => {
      if (typeof initMini3DPreview === 'function') {
        initMini3DPreview('bento-3d-canvas', 'robotics');
      }
    });

    // Inside .ldocx Container Interactive File Tree Logic
    const IDE_FILES = {
      ast: {
        tab: 'document.ast.json',
        sub: 'JSON AST Pretext Hierarchy',
        type: 'code',
        content: JSON.stringify({
          "$schema": "https://ldoc.io/spec/v2.5.0/document.schema.json",
          "version": "2.5.0",
          "meta": {
            "title": "Vanguard-7 Hypercar & Robotics Telemetry",
            "author": "Autonomous Dynamics Lab",
            "merkleRoot": "cf5e973d96c1f2eebbf1f6e31a2cec3ab3293ece187e984e4273d086560e203d"
          },
          "blocks": [
            {
              "id": "block-01",
              "type": "heading",
              "level": 1,
              "text": "Telemetry Specification"
            },
            {
              "id": "block-02",
              "type": "3d_model",
              "asset": "models/telemetry.glb",
              "actuatorTorque": 340,
              "interactive": true
            }
          ]
        }, null, 2)
      },
      model: {
        tab: 'models/telemetry.glb',
        sub: 'glTF 2.0 Binary 3D Mesh • Draco Compressed',
        type: '3d'
      },
      manifest: {
        tab: 'manifest.json',
        sub: 'Package Identity & Merkle Tree Root',
        type: 'code',
        content: JSON.stringify({
          "ldocVersion": "2.5.0",
          "docId": "vanguard_7_telemetry",
          "created": "2026-10-10T00:00:00Z",
          "generator": "LDOC Studio Pro Compiler",
          "hashAlgorithm": "SHA-256",
          "signature": "ed25519_valid",
          "entrypoints": {
            "ast": "document.ast.json",
            "fallback": "fallback.html"
          }
        }, null, 2)
      },
      sig: {
        tab: 'signatures/ed25519.sig',
        sub: 'Asymmetric Cryptographic Attestation',
        type: 'code',
        content: "-----BEGIN ED25519 SIGNATURE-----\\nMCowBQYDK2VwAyEAX5p5F9jOQ0lV4D6G5M3w5X9nZ8aK9bJ3yC1s7vW2rQ0=\\n-----END ED25519 SIGNATURE-----\\nHash Digest: cf5e973d96c1f2eebbf1f6e31a2cec3ab3293ece187e984e4273d086560e203d\\nStatus: 100% Verified Match against Root Certificate"
      },
      fallback: {
        tab: 'fallback.html',
        sub: '20-Year Standalone Longevity Viewer',
        type: 'code',
        content: "<!DOCTYPE html>\\n<html>\\n<head><title>Vanguard-7 Telemetry</title></head>\\n<body>\\n  <h1>Vanguard-7 Telemetry Specification</h1>\\n  <p>Self-contained archival container.</p>\\n</body>\\n</html>"
      }
    };

    function selectIdeFile(key, el) {
      document.querySelectorAll('.ide-tree-item').forEach(item => {
        item.style.background = 'transparent';
        item.style.color = '#94A3B8';
      });
      if (el) {
        el.style.background = 'rgba(245, 158, 11, 0.15)';
        el.style.color = '#FFF';
      }

      const file = IDE_FILES[key];
      if (!file) return;

      document.getElementById('ide-tab-label').textContent = file.tab;
      document.getElementById('ide-sub-label').textContent = file.sub;

      const codeView = document.getElementById('ide-code-view');
      const modelView = document.getElementById('ide-3d-view');

      if (file.type === '3d') {
        if (codeView) codeView.style.display = 'none';
        if (modelView) {
          modelView.style.display = 'flex';
          if (typeof initMini3DPreview === 'function') {
            initMini3DPreview('ide-mini-3d-canvas', 'actuator');
          }
        }
      } else {
        if (modelView) modelView.style.display = 'none';
        if (codeView) codeView.style.display = 'block';
        const codeEl = document.getElementById('ide-code-content');
        if (codeEl) codeEl.textContent = file.content;
      }
    }
    window.selectIdeFile = selectIdeFile;

    // Side-by-Side Video Autoplay Kickoff
    window.addEventListener('DOMContentLoaded', () => {
      const vid = document.getElementById('hero-side-video');
      if (vid) {
        vid.muted = true;
        const p = vid.play();
        if (p !== undefined) {
          p.catch(() => {
            const start = () => { vid.play(); window.removeEventListener('click', start); };
            window.addEventListener('click', start, { once: true });
          });
        }
      }
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, '..', 'index.html'), homeHtml, 'utf8');
console.log('Successfully rebuilt index.html with Vanguard-7 3D Telemetry & WebGL Engine!');
