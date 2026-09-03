const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const routes = [
  'live-studio', 'studio', 'viewer', 'format', 'features',
  'pricing', 'docs', 'changelog', 'models', 'templates', 'creator'
];

routes.forEach(r => {
  const src = path.join(__dirname, `${r}.html`);
  if (fs.existsSync(src)) {
    // 1. Flat file in public
    fs.copyFileSync(src, path.join(publicDir, `${r}.html`));
    // 2. Directory index in public
    const dir = path.join(publicDir, r);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(src, path.join(dir, 'index.html'));
  }
});

const tryDir = path.join(publicDir, 'studio', 'try');
if (!fs.existsSync(tryDir)) fs.mkdirSync(tryDir, { recursive: true });
if (fs.existsSync(path.join(__dirname, 'studio.html'))) {
  fs.copyFileSync(path.join(__dirname, 'studio.html'), path.join(tryDir, 'index.html'));
}

const assets = [
  'index.html', 'ai-brain.png', 'app.ico', 'daily-prophet.ldocx',
  'jszip.min.js', 'ldoc_background_image.png', 'ldoc_logo.png', 'manifest.json'
];

assets.forEach(a => {
  const src = path.join(__dirname, a);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(publicDir, a));
});

console.log('✓ Public output directory successfully assembled with all dual routes!');
