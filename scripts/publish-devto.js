// scripts/publish-devto.js
// Automated Dev.to Launch Article Publisher for Living Document Format (LDOC/LDOCX)
const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

const DEVTO_API_KEY = process.env.DEVTO_API_KEY;
if (!DEVTO_API_KEY) {
  console.error('ERROR: DEVTO_API_KEY is not defined in .env');
  process.exit(1);
}

const articlePayload = {
  article: {
    title: "Introducing the Living Document Format (.ldocx): The Next-Gen Interactive, 3D & Cryptographic Document Standard",
    published: true,
    tags: ["webdev", "javascript", "opensource", "productivity"],
    series: "Living Documents",
    canonical_url: "https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT",
    description: "Move beyond static PDFs and Word docs. Explore .ldocx — a modern ZIP-based, JSON-AST, Three.js 3D-embedded living document format with free multi-platform viewers and SDKs.",
    body_markdown: `---
title: Introducing the Living Document Format (.ldocx): The Next-Gen Interactive, 3D & Cryptographic Document Standard
published: true
tags: webdev, javascript, opensource, productivity
canonical_url: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT
---

# Why Are We Still Reading Flat PDFs in 2026?

For over three decades, the portable document format (PDF) and Microsoft Word (.docx) have defined the standard for digital documents. While they solved the problem of preserving page layouts across printers, the world has fundamentally shifted:

- We work with **real-time interactive 3D models**, WebGL scenes, and reactive charts.
- We require **tamper-proof cryptographic signatures** (SHA-256 / Ed25519) to authenticate document provenance.
- We need **semantic AST structures** that AI agents and search engines can parse without brittle OCR hacks.

Today, we are thrilled to announce the public release of the **Living Document Format (\`.ldoc\` / \`.ldocx\`) Ecosystem v2.5.0** — an open-standard, multi-platform document engine built from the ground up for modern computing.

---

## 🏛️ What is a Living Document (.ldocx)?

An \`.ldocx\` file is a self-contained, ZIP-packaged container adhering to open specifications:

\`\`\`
my-report.ldocx
├── manifest.json         # Schema version, document GUID, author & security flags
├── document.json         # AST (Abstract Syntax Tree) with layout, sections & nodes
├── signatures.json       # Multi-party cryptographic checksums & audit logs
├── assets/
│   ├── scene.glb         # Embedded Three.js 3D meshes & animations
│   ├── data.json         # Interactive datasets for live charts
│   └── images/           # High-resolution media assets
\`\`\`

### Key Capabilities:
1. **Interactive 3D & WebGL Embedded Directly in Pages**: Rotate, pan, and zoom CAD models, molecular structures, or architectural mockups right inside your document canvas.
2. **Deterministic Cryptographic Verification**: Every section contains an SHA-256 block hash. Changes to text or assets invalidate signatures immediately.
3. **Cross-Platform Native Runtimes**: Zero heavyweight runtimes. Fast, hardware-accelerated rendering on Windows, Linux, iOS, and Web.
4. **Developer-First SDK**: Complete Node.js / TypeScript SDK for parsing, validating, and generating \`.ldocx\` files programmatically.

---

## 🚀 Free Multi-Platform Distribution Downloads (v2.5.0)

All standalone viewers, editors, and SDKs are **100% free and open** for the global community:

### 🪟 Windows
- [**Download LDOC 3D Viewer (Windows)**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-viewer-windows.zip) (~3.71 MB)
- [**Download LDOC Document Editor (Windows)**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-editor-windows.zip) (~3.72 MB)
- [**Download Universal Windows Installer (setup.exe)**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/setup.exe) (~187 KB)
- [**Download Windows SDK Setup**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-sdk-setup.exe) (~187 KB)

### 🐧 Linux (Debian, Ubuntu, Fedora, Arch)
- [**Download LDOC Viewer (Linux tar.gz)**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-viewer-linux.tar.gz) (~3.59 MB)
- [**Download LDOC Editor (Linux tar.gz)**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-editor-linux.tar.gz) (~3.60 MB)

### 🍎 iOS (iPhone & iPad)
- [**Download LDOC iOS Touch Viewer**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-viewer-ios.zip) (~3.60 MB)
- [**Download LDOC iOS Touch Editor**](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/download/v2.5.0-free/ldoc-editor-ios.zip) (~3.61 MB)

---

## 💻 Developer Quickstart: Building with the SDK

Install the SDK in your project:

\`\`\`bash
# Install via npm
npm install ldoc-sdk
\`\`\`

### Parsing an \`.ldocx\` File in 5 Lines of Code:

\`\`\`javascript
const { LDOCXParser } = require('ldoc-sdk');
const fs = require('fs');

async function inspectDoc() {
  const fileBuffer = fs.readFileSync('quarterly-report.ldocx');
  const doc = await LDOCXParser.parse(fileBuffer);

  console.log('Document Title:', doc.manifest.title);
  console.log('Author:', doc.manifest.author);
  console.log('Embedded 3D Assets:', doc.getAssetsByType('3d-model'));
  console.log('Cryptographic Integrity:', doc.verifyIntegrity() ? 'VALID ✅' : 'TAMPERED ❌');
}

inspectDoc();
\`\`\`

---

## 🌐 Community & Open Source

We invite developers, researchers, technical writers, and designers to test the format, report feedback, and contribute to the ecosystem.

- **GitHub Repository**: [coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT)
- **Releases & Downloads**: [v2.5.0-free Release Hub](https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/tag/v2.5.0-free)

*Happy building, and welcome to the next era of documents!*`
  }
};

function postToDevTo(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: 'dev.to',
      port: 443,
      path: '/api/articles',
      method: 'POST',
      headers: {
        'api-key': DEVTO_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'LDOC-Publisher-Node'
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Dev.to API error (${res.statusCode}): ${JSON.stringify(json)}`));
          }
        } catch (e) {
          reject(new Error(`Dev.to HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('📝 Publishing Technical Launch Article to Dev.to');
  console.log('======================================================\n');

  try {
    const response = await postToDevTo(articlePayload);
    console.log('🎉 Dev.to Article Published Successfully!');
    console.log(`📌 Title: ${response.title}`);
    console.log(`👉 Live Article URL: ${response.url}`);
  } catch (err) {
    console.error('❌ Failed to publish article to Dev.to:', err.message);
    process.exit(1);
  }
}

main();
