// scripts/publish-github-release.js
// Automated Release Publisher for Living Document Format (LDOC/LDOCX)
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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT';
const [OWNER, REPO] = GITHUB_REPO.split('/');

if (!GITHUB_TOKEN) {
  console.error('ERROR: GITHUB_TOKEN is not defined in .env');
  process.exit(1);
}

function githubRequest(method, endpoint, body = null, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const isUpload = endpoint.startsWith('https://uploads.github.com');
    const url = isUpload ? new URL(endpoint) : new URL(`https://api.github.com${endpoint}`);

    const headers = {
      'User-Agent': 'LDOC-Release-Bot',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      ...customHeaders
    };

    if (body && !isUpload && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const text = buffer.toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch(e) {}

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(json || text);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${json ? JSON.stringify(json) : text}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function run() {
  console.log(`\n======================================================`);
  console.log(`🚀 Publishing GitHub Release for ${OWNER}/${REPO}`);
  console.log(`======================================================\n`);

  const tagName = 'v2.5.0-free';
  const releaseName = 'Living Document Format (LDOC/LDOCX) v2.5.0 — Free Multi-Platform Distribution';
  const releaseBody = `## 🌟 Welcome to the Living Document Format (LDOC/LDOCX) Ecosystem

The Next-Generation interactive, verifiable, 3D/multimodal document format designed to bridge the gap between static documents (PDF/DOCX) and modern interactive applications.

### 🚀 What's New in v2.5.0:
- 🖨️ **100% Watermark-Free Publication & PDF Print Engine**: Zero watermarks, zero promotional banners, and zero artificial author stamps. Clean multi-page printing on standard A4 canvas.
- ⚡ **Discrete GPU WebGL Hardware Acceleration**: Dedicated discrete GPU allocation (\`powerPreference: 'high-performance'\`) with automated VRAM lifecycle management for ultra-smooth 60+ FPS 3D rendering.
- 🔄 **Clean Universal Converters**: Lossless AST ingestion from PDF, Word (.docx), PowerPoint (.pptx), HTML, JSON, and 3D files without boilerplate notice text or artificial branding.
- 🛡️ **Cryptographic SHA-256 Merkle Verification**: Real-time per-block hash verification and instant tamper alerts.

### 📦 Free Multi-Platform Distribution Downloads

#### 🪟 Windows (Desktop)
- [**ldoc-viewer-windows.zip**](https://github.com/${OWNER}/${REPO}/releases/download/${tagName}/ldoc-viewer-windows.zip) (~3.71 MB) — Standalone Hardware-Accelerated 3D Viewer
- [**ldoc-editor-windows.zip**](https://github.com/${OWNER}/${REPO}/releases/download/${tagName}/ldoc-editor-windows.zip) (~3.72 MB) — Interactive WYSIWYG Document Editor
- [**setup.exe**](https://github.com/${OWNER}/${REPO}/releases/download/${tagName}/setup.exe) (~187 KB) — Universal Windows Setup & Launcher
- [**ldoc-sdk-setup.exe**](https://github.com/${OWNER}/${REPO}/releases/download/${tagName}/ldoc-sdk-setup.exe) (~187 KB) — Windows SDK & Shell Extension Setup

#### 🐧 Linux (x86_64 / Debian / Ubuntu / Arch)
- [**ldoc-viewer-linux.tar.gz**](https://github.com/${OWNER}/${REPO}/releases/download/${tagName}/ldoc-viewer-linux.tar.gz) (~3.59 MB) — Linux Native Portable Viewer
- [**ldoc-editor-linux.tar.gz**](https://github.com/${OWNER}/${REPO}/releases/download/${tagName}/ldoc-editor-linux.tar.gz) (~3.60 MB) — Linux Native Portable Editor

#### 🍎 iOS (Universal App / iPad / iPhone)
- [**ldoc-viewer-ios.zip**](https://github.com/${OWNER}/${REPO}/releases/download/${tagName}/ldoc-viewer-ios.zip) (~3.60 MB) — iOS Native Touch-Optimized Viewer
- [**ldoc-editor-ios.zip**](https://github.com/${OWNER}/${REPO}/releases/download/${tagName}/ldoc-editor-ios.zip) (~3.61 MB) — iOS Native Touch-Optimized Editor

#### 💻 Developers & SDK
- [**ldoc-dev-sdk.zip**](https://github.com/${OWNER}/${REPO}/releases/download/${tagName}/ldoc-dev-sdk.zip) (~62 KB) — Core JavaScript/TypeScript AST Parser & CLI
- **npm**: \`npm install ldoc-sdk\`

---
*Built with ❤️ for the open-source community. All packages above are 100% Free & Open-Source. Commercial LDOC Studio enterprise package remains local-only and proprietary.*`;

  // 1. Check if release already exists
  let release = null;
  try {
    const existing = await githubRequest('GET', `/repos/${OWNER}/${REPO}/releases/tags/${tagName}`);
    console.log(`ℹ️ Release ${tagName} already exists (ID: ${existing.id}). Updating metadata...`);
    release = await githubRequest('PATCH', `/repos/${OWNER}/${REPO}/releases/${existing.id}`, {
      name: releaseName,
      body: releaseBody
    });
    console.log(`✅ Release metadata updated successfully!`);
  } catch (err) {
    console.log(`Creating fresh release ${tagName}...`);
    release = await githubRequest('POST', `/repos/${OWNER}/${REPO}/releases`, {
      tag_name: tagName,
      target_commitish: 'main',
      name: releaseName,
      body: releaseBody,
      draft: false,
      prerelease: false
    });
    console.log(`✅ Release created successfully! URL: ${release.html_url}`);
  }

  // 2. Prepare files to upload
  const rootDir = path.resolve(__dirname, '..');
  const filesToUpload = [
    { name: 'ldoc-viewer-windows.zip', path: path.join(rootDir, 'dist', 'ldoc-viewer-windows.zip') },
    { name: 'ldoc-editor-windows.zip', path: path.join(rootDir, 'dist', 'ldoc-editor-windows.zip') },
    { name: 'setup.exe', path: path.join(rootDir, 'dist', 'setup.exe') },
    { name: 'ldoc-sdk-setup.exe', path: path.join(rootDir, 'dist', 'ldoc-sdk-setup.exe') },
    { name: 'ldoc-dev-sdk.zip', path: path.join(rootDir, 'dist', 'ldoc-dev-sdk.zip') },
    { name: 'ldoc-viewer-linux.tar.gz', path: path.join(rootDir, 'linux-dist', 'ldoc-viewer-linux.tar.gz') },
    { name: 'ldoc-editor-linux.tar.gz', path: path.join(rootDir, 'linux-dist', 'ldoc-editor-linux.tar.gz') },
    { name: 'ldoc-viewer-ios.zip', path: path.join(rootDir, 'ios-dist', 'ldoc-viewer-ios.zip') },
    { name: 'ldoc-editor-ios.zip', path: path.join(rootDir, 'ios-dist', 'ldoc-editor-ios.zip') }
  ];

  // Get existing assets to detect changes
  const existingAssets = release.assets || [];
  const existingMap = new Map(existingAssets.map(a => [a.name, a]));

  const forceUpload = process.argv.includes('--force');

  for (const file of filesToUpload) {
    if (!fs.existsSync(file.path)) {
      console.warn(`⚠️ Warning: ${file.path} not found. Skipping.`);
      continue;
    }

    const stat = fs.statSync(file.path);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);

    const existingAsset = existingMap.get(file.name);
    if (existingAsset) {
      if (existingAsset.size === stat.size && !forceUpload) {
        console.log(`⏩ Asset ${file.name} is already up to date (${sizeMb} MB). Skipping.`);
        continue;
      }
      console.log(`🔄 Asset ${file.name} size changed (remote: ${existingAsset.size} bytes, local: ${stat.size} bytes). Deleting old asset...`);
      try {
        await githubRequest('DELETE', `/repos/${OWNER}/${REPO}/releases/assets/${existingAsset.id}`);
        console.log(`   🗑️ Deleted old asset ${file.name} (ID: ${existingAsset.id})`);
      } catch (delErr) {
        console.warn(`   ⚠️ Warning deleting old asset ${file.name}: ${delErr.message}`);
      }
    }

    console.log(`⬆️ Uploading fresh ${file.name} (${sizeMb} MB)...`);
    const fileBuffer = fs.readFileSync(file.path);
    const uploadUrl = `https://uploads.github.com/repos/${OWNER}/${REPO}/releases/${release.id}/assets?name=${encodeURIComponent(file.name)}`;

    try {
      await githubRequest('POST', uploadUrl, fileBuffer, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileBuffer.length
      });
      console.log(`   ✅ Uploaded fresh: ${file.name} (${sizeMb} MB)`);
    } catch (uploadErr) {
      console.error(`   ❌ Failed to upload ${file.name}:`, uploadErr.message);
    }
  }

  console.log(`\n🎉 All distribution packages successfully published to:`);
  console.log(`👉 ${release.html_url}\n`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
