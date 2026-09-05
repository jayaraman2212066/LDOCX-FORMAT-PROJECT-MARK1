# ◈ Living Document Format (.ldocx) Ecosystem

[![GitHub Releases](https://img.shields.io/github/v/release/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT?label=Release&color=blue)](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/tag/v2.5.0-free)
[![npm version](https://img.shields.io/npm/v/ldoc-sdk.svg?color=success)](https://www.npmjs.com/package/ldoc-sdk)
[![License: MIT / Apache-2.0](https://img.shields.io/badge/License-MIT%20%2F%20Apache--2.0-blue.svg)](LICENSE)
[![Platform: Windows | Linux | iOS | Web](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20iOS%20%7C%20Web-brightgreen.svg)]()
[![Deploy to GitHub Pages](https://github.com/jayaraman2212066/LDOCX-FORMAT-PROJECT-MARK1/actions/workflows/deploy.yml/badge.svg)](https://github.com/jayaraman2212066/LDOCX-FORMAT-PROJECT-MARK1/actions/workflows/deploy.yml)

> **The Next-Generation Interactive, 3D, and Cryptographic Document Standard.**
> Moving beyond static 1990s PDFs and Word files. `.ldocx` packages rich interactive Three.js 3D models, reactive data charts, offline multimedia, executable sandboxes, and cryptographic SHA-256 Merkle-tree validation into a single, self-contained, offline-first container.

---

## 📦 100% Free Multi-Platform Distribution (v2.5.0)

All standalone viewers, editors, command-line utilities, and developer SDKs are **100% free and open** for the global community:

| Platform | Free Package | Download Link | Description |
| :--- | :--- | :--- | :--- |
| **🪟 Windows** | **3D Viewer** | [**ldoc-viewer-windows.zip**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-viewer-windows.zip) (~4.07 MB) | Standalone hardware-accelerated 3D document viewer |
| **🪟 Windows** | **Document Editor** | [**ldoc-editor-windows.zip**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-editor-windows.zip) (~4.08 MB) | Lightweight WYSIWYG living document editor |
| **🪟 Windows** | **Universal Setup** | [**setup.exe**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/setup.exe) (~187 KB) | 1-Click native Windows desktop launcher & installer |
| **🪟 Windows** | **SDK Setup** | [**ldoc-sdk-setup.exe**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-sdk-setup.exe) (~187 KB) | Windows SDK tools and shell integration |
| **🐧 Linux** | **Native Viewer** | [**ldoc-viewer-linux.tar.gz**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-viewer-linux.tar.gz) (~3.60 MB) | Portable standalone viewer for Ubuntu, Debian, Fedora, Arch |
| **🐧 Linux** | **Native Editor** | [**ldoc-editor-linux.tar.gz**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-editor-linux.tar.gz) (~3.61 MB) | Portable standalone editor for Linux workstations |
| **🍎 iOS** | **Touch Viewer** | [**ldoc-viewer-ios.zip**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-viewer-ios.zip) (~3.61 MB) | Touch-optimized native viewer for iPad and iPhone |
| **🍎 iOS** | **Touch Editor** | [**ldoc-editor-ios.zip**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-editor-ios.zip) (~3.62 MB) | Mobile document creator & editor for iOS devices |
| **💻 Developers** | **Core SDK Bundle** | [**ldoc-dev-sdk.zip**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-dev-sdk.zip) (~62 KB) | Core AST parser, validator, and Node.js toolkit |
| **🌐 npm Registry** | **Node.js / TS** | `npm install ldoc-sdk` | Official JavaScript/TypeScript SDK on [npmjs.com/package/ldoc-sdk](https://www.npmjs.com/package/ldoc-sdk) |

> [!NOTE]
> **Product Architecture Notice**: The Living Document Specification (`.ldocx`), free 3D Viewers, Document Editors, and developer SDKs are open-source and free for all users. The commercial LDOC Studio enterprise workspace is a proprietary product maintained locally and is never deployed or distributed across free public channels.

---

## 🌟 Latest Updates & Breakthrough Capabilities

### 1. 🖨️ 100% Watermark-Free & Clean PDF Print Export Engine
- **Publication-Grade Print Output**: Export documents to clean, unbranded PDFs or physical printers via `Ctrl+P`, `window.print()`, or the built-in multi-page print engine.
- **Zero Watermarks & Zero Promotional Stamps**: Removed all artificial header banners, footer advertisements, promotional engine stamps, and branding overlays.
- **Clean A4 Pagination**: Automatically hides editor chrome, toolbars, sidebars, layers, and inspectors during print to output crisp charcoal/black typography on a clean white page.
- **100% Offline Capability**: Multi-page printing and PDF flattening execute directly inside your browser or desktop WebView without needing external internet connection or cloud servers.

### 2. ⚡ Discrete High-Performance GPU WebGL Hardware Acceleration
- **Discrete GPU Allocation**: Automatically commands the OS graphics switcher (`powerPreference: 'high-performance'`) to utilize dedicated NVIDIA / AMD discrete GPUs and dedicated VRAM rather than integrated graphics.
- **Zero-Lag 60+ FPS Rendering**: Hardware-accelerated camera orbits, pans, zooms, wireframe toggles, and complex mesh animations.
- **Automated VRAM Management & Leak Prevention**: Automatically unmounts inactive WebGL contexts, cleans up framebuffers and textures, and includes automatic `webglcontextlost` recovery to eliminate crashes under high memory pressure.

### 3. 🔄 Clean Universal Document Converters
- **Instant AST Conversion**: Ingest legacy files directly into clean `.ldocx` format:
  - **PDF (`.pdf`)**: Layout metadata and semantic text blocks preserved without artificial author stamps or dummy filler paragraphs.
  - **Word (`.docx`)**: Clean semantic paragraph, heading, and table extraction.
  - **PowerPoint (`.pptx`)**: Multi-slide layout extraction into interactive presentation decks.
  - **HTML & Markdown**: Instant structural AST mapping.
  - **3D Files (`.obj`, `.stl`, `.gltf`, `.glb`)**: Auto-wrapped into interactive 3D WebGL scenes.

### 4. 🛡️ Cryptographic SHA-256 Merkle-Tree Document Integrity
- Every block, paragraph, and embedded asset is cryptographically hashed with SHA-256.
- Any unauthorized tampering with clauses, payment terms, or images triggers an instant visual and programmatic tamper alarm in under 15 milliseconds.

### 5. 🌊 Interactive Multimodal Widgets
- **Live 3D WebGL Models**: Real-time camera controls, rotation, exploded views, and annotations.
- **Fluid Temporal Dynamics**: Interactive surface ripple wave simulations reacting to cursor movements and taps.
- **Particle Physics**: Real-time particle simulations (*Cyber Stardust*, *Hyperspace Warp*, *Golden Embers*, *Crystal Shards*).
- **Reactive Sandboxes**: Self-contained JSX/JavaScript widgets running securely inside sandboxed iframes.

---

## 🌐 Live Online Demos

Try the free Living Document tools directly in your browser with zero installation:

- **🚀 Live Studio & Viewer:** [https://jayaraman2212066.github.io/LDOCX-FORMAT-PROJECT-MARK1/](https://jayaraman2212066.github.io/LDOCX-FORMAT-PROJECT-MARK1/)
- **✨ Live Standalone Creator:** [https://jayaraman2212066.github.io/LDOCX-FORMAT-PROJECT-MARK1/creator.html](https://jayaraman2212066.github.io/LDOCX-FORMAT-PROJECT-MARK1/creator.html)

---

## 💻 Developer Quickstart (npm SDK)

### Installation
```bash
npm install ldoc-sdk
```

### Inspect and Verify a Document in 5 Lines of Code:
```javascript
const { LDOCXParser } = require('ldoc-sdk');
const fs = require('fs');

async function verifyDocument() {
  const fileBuffer = fs.readFileSync('quarterly-report.ldocx');
  const doc = await LDOCXParser.parse(fileBuffer);

  console.log('Title:', doc.manifest.title);
  console.log('Integrity:', doc.verifyIntegrity() ? '✅ Authentic' : '❌ Tampered');
  console.log('3D Models:', doc.getAssetsByType('3d-model'));
}

verifyDocument();
```

---

## 📁 Repository Structure

```
LDOCX-FORMAT-PROJECT-MARK1/
├── index.html                  # Free Living Document Studio & Viewer
├── creator.html                # Free Standalone Creator with Live Presentation Preview
├── viewer.html                 # Free Lightweight Document Viewer
├── editor.html                 # Free Document Editor
├── dist/                       # Free Windows Release Binaries & Installers
├── linux-dist/                 # Free Linux Portable Binaries (.tar.gz)
├── ios-dist/                   # Free iOS Touch Bundles (.zip)
├── scripts/                    # Automation & distribution utilities
│   ├── campaign-calendar.json  # 7-day technical comparison campaign calendar
│   ├── daily-promoter.js       # Automated daily multi-channel showcase engine
│   └── publish-github-release.js # GitHub Release asset publisher (Free packages only)
├── source/                     # Core Rust crates & test suite
│   ├── ldoc-core/              # Core format, encryption, signing, AST parser & validator
│   ├── ldoc-server/            # Axum/Tokio web server & API
│   ├── ldoc-cli/               # Command-line interface (`ldoc`)
│   └── tests/                  # 499 integration & security tests (100% passing)
├── specs/                      # Formal LDOCX format specifications & JSON schemas
└── samples/                    # Sample living documents (.ldocx)
```

---

## 📄 License & Open Standards

The Core Specification, 3D Viewer, Document Editor, and Developer SDK are licensed under the open **MIT License** and **Apache-2.0 License**. See [LICENSE](LICENSE) for details.
