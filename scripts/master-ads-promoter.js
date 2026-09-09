// scripts/master-ads-promoter.js
// Automated 5 Master Production Ads Multi-Channel Promoter
// Broadcasts to LinkedIn, Threads, Instagram (via Buffer) & Discord (#general)

const fs = require('fs');
const path = require('path');
const { publishSinglePost, CHANNELS, DISCORD } = require('./zapier-social-publisher');

const calendarPath = path.resolve(__dirname, 'master-ads-calendar.json');
const statePath = path.resolve(__dirname, 'master-ads-state.json');

if (!fs.existsSync(calendarPath)) {
  console.error('ERROR: master-ads-calendar.json not found!');
  process.exit(1);
}

const calendar = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));

let state = {
  currentCycle: 1,
  lastRunDate: null,
  completedAds: [],
  history: []
};

if (fs.existsSync(statePath)) {
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (e) {}
}

async function promoteMasterAd(adNumber, method = 'queue') {
  const ad = calendar.find(c => c.adNumber === adNumber);
  if (!ad) {
    throw new Error(`Master Ad ${adNumber} not found in master-ads-calendar.json!`);
  }

  console.log(`\n===============================================================`);
  console.log(`🎬 BROADCASTING MASTER AD ${ad.adNumber} OF 5: "${ad.title}"`);
  console.log(`💡 Angle: "${ad.angle}"`);
  console.log(`🎯 Platforms: ${ad.targetPlatforms.join(', ')}`);
  console.log(`🖼️ Poster CDN: ${ad.posterUrl}`);
  console.log(`===============================================================\n`);

  // Dispatch to LinkedIn, Threads, Instagram, and Discord with video link included
  const videoNote = `\n\n📹 **Watch 2K Quad HD Video Ad**: ${ad.videoUrl}`;
  const videoNotePlain = `\n\n📹 Watch 2K Video: ${ad.videoUrl}`;

  const results = await publishSinglePost({
    linkedinText: ad.linkedin + videoNotePlain,
    threadsText: ad.threads + videoNotePlain,
    instagramText: ad.instagram + videoNotePlain,
    discordText: ad.discord + videoNote,
    imageUrl: ad.posterUrl,
    method,
    postToDiscord: true
  });

  // Update State
  const todayStr = new Date().toISOString().split('T')[0];
  state.lastRunDate = todayStr;
  if (!state.completedAds.includes(adNumber)) {
    state.completedAds.push(adNumber);
  }
  state.history.push({
    date: todayStr,
    adNumber,
    id: ad.id,
    title: ad.title,
    method
  });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  console.log(`\n🎉 Master Ad ${adNumber} successfully processed and recorded!`);
  return results;
}

async function queueAllMasterAds() {
  console.log(`\n🚀 Starting 5 Master Production Ads Multi-Channel Pipeline...`);
  console.log(`📢 Channels: LinkedIn, Threads, Instagram, and Discord`);

  for (let num = 1; num <= 5; num++) {
    console.log(`\n>>> Scheduling Master Ad ${num}/5...`);
    const method = (num === 1) ? 'share_now' : 'queue';
    await promoteMasterAd(num, method);
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log(`\n🌟 ALL 5 MASTER ADS SCHEDULED ACROSS ALL PLATFORMS!`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--all') || args.includes('--queue-all')) {
    await queueAllMasterAds();
    return;
  }

  let targetAd = null;
  const adArgIdx = args.indexOf('--ad');
  if (adArgIdx !== -1 && args[adArgIdx + 1]) {
    targetAd = parseInt(args[adArgIdx + 1], 10);
  } else {
    for (let d = 1; d <= 5; d++) {
      if (!state.completedAds.includes(d)) {
        targetAd = d;
        break;
      }
    }
    if (!targetAd) targetAd = 1;
  }

  const method = args.includes('--share-now') ? 'share_now' : 'queue';
  await promoteMasterAd(targetAd, method);
}

main().catch(err => {
  console.error('Fatal Master Ad promoter error:', err);
  process.exit(1);
});

module.exports = { promoteMasterAd, queueAllMasterAds };
