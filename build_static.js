const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const filesToCopy = [
  'index.html',
  'creator.html',
  'studio.html',
  'models.html',
  'jszip.min.js',
  'ldoc_logo.png',
  'ldoc_background_image.png',
  'ai-brain.png',
  'app.ico',
  'manifest.json',
  'daily-prophet.ldocx'
];

for (const file of filesToCopy) {
  const src = path.join(__dirname, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

// Copy directories
for (const dir of ['samples', 'examples']) {
  const srcDir = path.join(__dirname, dir);
  const destDir = path.join(publicDir, dir);
  if (fs.existsSync(srcDir)) {
    fs.cpSync(srcDir, destDir, { recursive: true });
  }
}


// Create directory-based routes for 100% reliable URL matching on Vercel
const routeDirs = [
  { dir: 'studio', src: 'studio.html' },
  { dir: 'models', src: 'models.html' },
  { dir: 'templates', src: 'models.html' },
  { dir: 'creator', src: 'creator.html' },
  { dir: 'viewer', src: 'studio.html' }
];

for (const r of routeDirs) {
  const targetDir = path.join(publicDir, r.dir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const srcFile = path.join(__dirname, r.src);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(targetDir, 'index.html'));
  }
}

console.log('✓ Public output directory successfully assembled for Vercel deployment!');
