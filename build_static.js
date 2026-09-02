const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const filesToCopy = [
  'index.html',
  'creator.html',
  'gta6_lightbox_mesh.js',
  'jszip.min.js',
  'ldoc_logo.png',
  'ldoc_background_image.png',
  'ai-brain.png',
  'app.ico',
  'manifest.json',
  'gt6-velocity-unleashed.ldocx',
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

console.log('✓ Public output directory successfully assembled for Vercel deployment!');
