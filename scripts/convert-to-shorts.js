// scripts/convert-to-shorts.js
// Converts 16:9 2K Quad HD landscape ads into 9:16 (1080x1920) vertical videos
// optimized for YouTube Shorts, Instagram Reels, TikTok, and Threads mobile feeds.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');

const rootDir = path.resolve(__dirname, '..');
const catalogPath = path.join(__dirname, 'unified-ads-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const outDir = path.join(rootDir, 'public', 'shorts');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function convertToShort(inputPath, outputPath, posterPath) {
  console.log(`\n======================================================`);
  console.log(`🎬 Converting: ${path.basename(inputPath)} -> 9:16 Vertical (1080x1920)`);
  console.log(`📦 Output: ${outputPath}`);

  // FFmpeg filter graph:
  // 1. Scale and crop input to fill 1080x1920 background, then blur it heavily.
  // 2. Scale crisp original to full 1080px width (1080x608).
  // 3. Center foreground video over the ambient moving background.
  const filterGraph = [
    '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:5[bg]',
    '[0:v]scale=1080:-2[fg]',
    '[bg][fg]overlay=0:(H-h)/2[v]'
  ].join(';');

  const args = [
    '-y',
    '-i', inputPath,
    '-filter_complex', filterGraph,
    '-map', '[v]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '21',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    outputPath
  ];

  const res = spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (res.status !== 0) {
    throw new Error(`FFmpeg exited with code ${res.status}`);
  }

  // Generate vertical poster frame snapshot at 1s mark
  if (posterPath) {
    console.log(`🖼️ Generating 9:16 poster frame: ${posterPath}`);
    spawnSync(ffmpeg, [
      '-y',
      '-ss', '00:00:01',
      '-i', outputPath,
      '-vframes', '1',
      '-q:v', '2',
      posterPath
    ], { stdio: 'ignore' });
  }

  const stats = fs.statSync(outputPath);
  console.log(`✅ Success! Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}

async function uploadToCatboxWithRetry(filePath, mimeType, filename, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`   [Attempt ${attempt}/${retries}] Uploading ${filename}...`);
      const buffer = fs.readFileSync(filePath);
      const form = new FormData();
      form.append('reqtype', 'fileupload');
      form.append('fileToUpload', new Blob([buffer], { type: mimeType }), filename);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

      const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: form,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const text = await res.text();
      if (!text.startsWith('https://')) throw new Error('Catbox returned: ' + text);
      return text.trim();
    } catch (err) {
      console.warn(`   ⚠️ Upload attempt ${attempt} failed: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

async function processAllAds({ upload = false } = {}) {
  console.log('🚀 Phase 1: Converting all 8 catalog ads to 9:16 Vertical Shorts...');

  for (const ad of catalog) {
    const inputVideo = path.join(rootDir, 'public', 'ads', `${ad.id}.mp4`);
    if (!fs.existsSync(inputVideo)) {
      console.warn(`⚠️ Skipping Ad ${ad.index}: File not found ${inputVideo}`);
      continue;
    }

    const shortId = `short_${ad.id}`;
    const outputVideo = path.join(outDir, `${shortId}.mp4`);
    const outputPoster = path.join(outDir, `${shortId}.jpg`);

    if (!fs.existsSync(outputVideo)) {
      convertToShort(inputVideo, outputVideo, outputPoster);
    } else {
      console.log(`⏩ Ad ${ad.index} short already exists: ${outputVideo}`);
    }

    ad.shortsLocalVideo = `public/shorts/${shortId}.mp4`;
    ad.shortsLocalPoster = `public/shorts/${shortId}.jpg`;
  }
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log('✅ Phase 1 complete: All 8 vertical videos generated locally on disk.');

  if (upload) {
    console.log('\n🚀 Phase 2: Uploading 9:16 Vertical Shorts to CDN...');
    for (const ad of catalog) {
      const shortId = `short_${ad.id}`;
      const outputVideo = path.join(outDir, `${shortId}.mp4`);
      const outputPoster = path.join(outDir, `${shortId}.jpg`);

      if (fs.existsSync(outputVideo) && (!ad.shortsVideoUrl || !ad.shortsVideoUrl.startsWith('https://files.catbox.moe/'))) {
        try {
          const vUrl = await uploadToCatboxWithRetry(outputVideo, 'video/mp4', `${shortId}.mp4`);
          console.log(`✅ Ad ${ad.index} Shorts Video CDN: ${vUrl}`);
          ad.shortsVideoUrl = vUrl;
          fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
        } catch (e) {
          console.error(`❌ Failed to upload video for Ad ${ad.index}: ${e.message}`);
        }
      }

      if (fs.existsSync(outputPoster) && (!ad.shortsPosterUrl || !ad.shortsPosterUrl.startsWith('https://files.catbox.moe/'))) {
        try {
          const pUrl = await uploadToCatboxWithRetry(outputPoster, 'image/jpeg', `${shortId}.jpg`);
          console.log(`✅ Ad ${ad.index} Shorts Poster CDN: ${pUrl}`);
          ad.shortsPosterUrl = pUrl;
          fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
        } catch (e) {
          console.error(`❌ Failed to upload poster for Ad ${ad.index}: ${e.message}`);
        }
      }
    }
  }

  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  console.log('\n🎉 All 9:16 Vertical Shorts processing complete!');
}

async function main() {
  const args = process.argv.slice(2);
  const doUpload = args.includes('--upload');
  await processAllAds({ upload: doUpload });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Conversion failed:', err);
    process.exit(1);
  });
}

module.exports = { convertToShort, processAllAds };
