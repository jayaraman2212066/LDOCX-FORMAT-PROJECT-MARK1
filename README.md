# ◈ LDOCX — The Living Document Architecture & Studio

[![Deploy to GitHub Pages](https://github.com/jayaraman2212066/LDOCX-FORMAT-PROJECT-MARK1/actions/workflows/deploy.yml/badge.svg)](https://github.com/jayaraman2212066/LDOCX-FORMAT-PROJECT-MARK1/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Rust: 1.80+](https://img.shields.io/badge/Rust-1.80%2B-orange.svg)](https://www.rust-lang.org)
[![Platform: Web%20%7C%20Windows](https://img.shields.io/badge/Platform-Web%20%7C%20Windows-brightgreen.svg)]()

> **The next-generation, reactive, and interactive document container format for the web and desktop.**
> Replace static PDF documents with enchanting, reactive, multi-page Living Documents equipped with 3D WebGL holograms, real-time audio/video soundtracks, fluid dynamics, autonomous particle physics, reactive JSX sandboxes, and integrated Stripe payments.

---

## 🌐 Live Online Demo

Experience the full **LDOC Living Document Studio** online directly in your browser:

- **🚀 Live Studio & Viewer:** [https://jayaraman2212066.github.io/LDOCX-FORMAT-PROJECT-MARK1/](https://jayaraman2212066.github.io/LDOCX-FORMAT-PROJECT-MARK1/)
- **✨ Live Standalone Creator:** [https://jayaraman2212066.github.io/LDOCX-FORMAT-PROJECT-MARK1/creator.html](https://jayaraman2212066.github.io/LDOCX-FORMAT-PROJECT-MARK1/creator.html)

Deploy your own instance with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjayaraman2212066%2FLDOCX-FORMAT-PROJECT-MARK1)

---

## 🌟 Key Highlights & Features

### 1. 👁️ Real-Time Live Presentation Preview (Split View)
- Work side-by-side: View your document live in real time as you edit blocks, change text, and add elements.
- Instant reactive synchronization with debounced AST compilation and 3D depth tilt tracking.
- Toggle between full-width and split-view with a single click.

### 2. ◈ Dynamic LDOC Studios Logo Loader
- Official **◈ ◈ ◈** LDOC Studio triple-diamond insignia with pulsing chromatic glow effects (Gold `#f59e0b`, Nebula Purple `#c084fc`, and Cyan `#38bdf8`).
- Active across all compilation, loading, and export actions.

### 3. ⚜ Living Document Enhancement Wizard (Side Landscape Drawer)
- **Dynamic Landscape View**: Expandable side drawer with a `⤢ Landscape View` toggle for spacious visual exploration.
- **5 Power Enhancer Modules**:
  1. 🌊 **Fluid Temporal Dynamics**: Interactive surface ripple wave simulations reacting to cursor movements and taps.
  2. ✨ **Particle Physics Constellations**: Real-time particle simulations (*Cyber Stardust*, *Hyperspace Warp*, *Golden Embers*, *Crystal Shards*) with mouse gravitational attractor.
  3. ⚡ **Interactive Reactive Sandboxes**: Pre-engineered widgets (*Velocity Dyno Speedometer*, *Wand Spell Matrix*, *Orbital Trajectory Sim*, *ARR Multiple Projector*).
  4. 📐 **3D Holographic Perspective Tilt**: Real-time cursor depth tracking with toggle switch.
  5. 💳 **Smart Action & Stripe Links**: One-click insertions for Stripe checkouts and webhook lead capture forms.

### 4. 💳 Action Routing, Stripe Payment Links & Lead Forms
- **Buttons (`button`)**: Supports direct Stripe payment links (`https://buy.stripe.com/...`), page navigation (`next`, `previous`, page numbers), form submit webhooks, and custom theme designs (*Royal Gold*, *Neon Cyan*, *Purple Nebula*, *Obsidian*).
- **Forms (`form`)**: Webhook endpoint URLs for instant CRM and dispatch notifications.
- **Pre-Order (`preorder`)**: Dedicated tier badges, pricing, perks summary, and direct Stripe checkout redirects.

### 5. ⚡ In-Editor Live Visual Previews
- Experience your interactive widgets directly within the editor block cards:
  - Live JSX sandbox with responsive controls.
  - Live particle physics simulations.
  - Interactive water ripple canvas.

### 6. 🛡️ Resilient Error Boundaries
- Graceful error fallbacks (`.ldoc-error-fallback`) wrapped around all WebGL 3D model loaders and dynamic sandbox scripts with one-click retry buttons.

---

## 📁 Repository Structure

```
LDOCX-FORMAT-PROJECT-MARK1/
├── index.html                  # Main Living Document Studio (Viewer, Editor, Converter, Templates)
├── creator.html                # Standalone Document Creator with Live Presentation Preview
├── ai-brain.png                # LDOC Studio brand asset
├── vercel.json                 # Vercel deployment configuration
├── netlify.toml                # Netlify deployment configuration
├── Launch LDOC Studio.bat      # Windows Desktop 1-Click Launcher
├── build_installer.bat         # NSIS Windows installer compiler
├── installer.nsi               # NSIS installer definition script
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions automated Pages deployment
├── app/                        # Compiled desktop application and server binaries
│   ├── ldoc-server.exe         # High-performance Rust HTTP/WebSocket document server
│   └── viewer/                 # Static web application bundle
├── source/                     # Rust backend crates & test suite
│   ├── Cargo.toml              # Workspace manifest
│   ├── ldoc-core/              # Core format, encryption, signing, AST parser & validator
│   ├── ldoc-server/            # Axum/Tokio web server & API
│   ├── ldoc-cli/               # Command-line interface (`ldoc`)
│   ├── ldoc-sdk/               # Rust client SDK
│   └── tests/                  # 499 integration & security tests (100% passing)
├── specs/                      # Formal LDOCX format specifications & JSON schemas
├── samples/                    # Sample living documents (.ldocx)
└── examples/                   # Document examples and templates
```

---

## 🚀 Quick Start Guide

### Option A: Online Web Usage (No Installation)
Visit [https://jayaraman2212066.github.io/LDOCX-FORMAT-PROJECT-MARK1/](https://jayaraman2212066.github.io/LDOCX-FORMAT-PROJECT-MARK1/) to start creating and viewing living documents immediately.

### Option B: Windows Desktop Application (Zero Config)
1. Clone this repository:
   ```bash
   git clone https://github.com/jayaraman2212066/LDOCX-FORMAT-PROJECT-MARK1.git
   ```
2. Double-click:
   ```cmd
   Launch LDOC Studio.bat
   ```
3. The server starts silently in the background and opens LDOC Studio in your browser at `http://127.0.0.1:8080/`.

### Option C: Compile from Rust Source
Prerequisites: Rust 1.80+ and `cargo` installed.
```bash
cd source
cargo build --release
cargo test
```
Run the local server:
```bash
cargo run --release -p ldoc-server
```

---

## 📜 Specification & Schema

The `.ldocx` format is an open, cryptographically verified document archive container:
- `manifest.json`: Document identity, pages, permissions, signatures, and theme metadata.
- `content.ast`: Strongly-typed Abstract Syntax Tree representing interactive components, headings, media, and reactive sandboxes.
- `assets/`: Embedded images, 3D meshes (`.obj`, `.stl`, `.gltf`), audio loops, and video streams.
- `signatures/`: Ed25519 cryptographic signatures validating document authenticity and tamper resistance.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
