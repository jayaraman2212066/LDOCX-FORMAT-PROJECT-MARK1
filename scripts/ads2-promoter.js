const fs = require('fs');
const path = require('path');
const { publishSinglePost, CHANNELS, DISCORD } = require('./zapier-social-publisher');

const calendarPath = path.resolve(__dirname, 'ads2-calendar.json');
const statePath = path.resolve(__dirname, 'ads2-state.json');

const calendar = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));

let state = { currentCycle: 1, lastRunDate: null, completedAds: [], history: [] };
if (fs.existsSync(statePath)) {
  try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch (e) {}
}

async function promoteAds2(adNumber, method = 'share_now', { postYouTube = false } = {}) {
  const ad = calendar.find(c => c.adNumber === adNumber);
  if (!ad) throw new Error('Ad not found: ' + adNumber);

  console.log('\n===============================================================');
  console.log('🎬 BROADCASTING ADS2 VIDEO ' + ad.adNumber + ' OF 3: "' + ad.title + '"');
  console.log('💡 Angle: "' + ad.angle + '"');
  console.log('📹 Video CDN: ' + ad.videoUrl);
  console.log('🖼️ Poster CDN: ' + ad.posterUrl);
  console.log('===============================================================\n');

  const videoNotePlain = '\n\n📹 Watch 2K Video: ' + ad.videoUrl;
  const discordText = ad.discord + '\n\n🎬 **Watch 2K Quad HD Video**:\n' + ad.videoUrl;

  const results = await publishSinglePost({
    linkedinText: ad.linkedin + videoNotePlain,
    threadsText: ad.threads + videoNotePlain,
    instagramText: ad.instagram + videoNotePlain,
    discordText: discordText,
    imageUrl: ad.posterUrl,
    videoUrl: ad.videoUrl,
    method,
    postToDiscord: true,
    postToYouTube: postYouTube,
    youtubeTitle: 'Living Document (.ldocx) — ' + ad.title,
    youtubeDescription: ad.linkedin,
    youtubePrivacy: 'public'
  });

  const todayStr = new Date().toISOString().split('T')[0];
  state.lastRunDate = todayStr;
  if (!state.completedAds.includes(adNumber)) state.completedAds.push(adNumber);
  state.history.push({ date: todayStr, adNumber, id: ad.id, title: ad.title, method, postYouTube });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  console.log('\n🎉 ADS2 Ad ' + adNumber + ' successfully processed and recorded!');
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  let targetAd = 1;
  const adArgIdx = args.indexOf('--ad');
  if (adArgIdx !== -1 && args[adArgIdx + 1]) {
    targetAd = parseInt(args[adArgIdx + 1], 10);
  }

  const method = args.includes('--queue') ? 'queue' : 'share_now';
  const postYouTube = args.includes('--youtube');
  await promoteAds2(targetAd, method, { postYouTube });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal ADS2 promoter error:', err);
    process.exit(1);
  });
}

module.exports = { promoteAds2 };
