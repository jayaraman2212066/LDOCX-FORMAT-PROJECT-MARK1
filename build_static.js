const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Subdirectory index routes
const subDirs = [
  { dir: 'live-studio', src: 'studio.html' },
  { dir: 'studio', src: 'studio.html' },
  { dir: 'studio/try', src: 'studio.html' },
  { dir: 'models', src: 'models.html' },
  { dir: 'templates', src: 'models.html' },
  { dir: 'creator', src: 'creator.html' },
  { dir: 'viewer', src: 'studio.html' },
  { dir: 'format', src: 'format/index.html' },
  { dir: 'features', src: 'features/index.html' },
  { dir: 'pricing', src: 'pricing/index.html' },
  { dir: 'docs', src: 'docs/index.html' },
  { dir: 'changelog', src: 'changelog/index.html' }
];

subDirs.forEach(({ dir, src }) => {
  const targetDir = path.join(publicDir, dir);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const sourceFile = path.join(__dirname, src);
  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, path.join(targetDir, 'index.html'));
  }
});

// Root static files
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

filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  const dest = path.join(publicDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
});

console.log('✓ Public output directory successfully assembled for Vercel deployment!');
