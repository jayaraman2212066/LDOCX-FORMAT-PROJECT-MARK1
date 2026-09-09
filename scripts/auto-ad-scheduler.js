// scripts/auto-ad-scheduler.js
// Autonomous Multi-Platform 2K Quad HD Video Ad Scheduling & Publishing Engine
// Manages continuous daily posting and future queueing across LinkedIn, Threads, Instagram, Discord, and YouTube.

const fs = require('fs');
const path = require('path');
const { publishSinglePost, CHANNELS, DISCORD } = require('./zapier-social-publisher');

const catalogPath = path.resolve(__dirname, 'unified-ads-catalog.json');
const statePath = path.resolve(__dirname, 'unified-schedule-state.json');
const logsDir = path.resolve(__dirname, '..', 'logs');
const logFilePath = path.join(logsDir, 'ad-scheduler.log');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function logMsg(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(logFilePath, line + '\n', 'utf8'); } catch (e) {}
}

if (!fs.existsSync(catalogPath)) {
  console.error('ERROR: unified-ads-catalog.json not found!');
  process.exit(1);
}
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

let state = {
  currentCycle: 1,
  nextAdIndex: 3,
  lastRunDate: null,
  totalBroadcasts: 0,
  history: []
};
if (fs.existsSync(statePath)) {
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (e) {}
}

function saveState() {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

async function postAdByIndex(adIndex, method = 'share_now', { postYouTube = true } = {}) {
  const ad = catalog.find(a => a.index === adIndex);
  if (!ad) throw new Error('Ad not found with index ' + adIndex);

  logMsg(`🎬 [CYCLE ${state.currentCycle}] DISPATCHING AD ${ad.index}/${catalog.length}: "${ad.title}" (Method: ${method})`);
  logMsg(`💡 Angle: "${ad.angle}"`);
  logMsg(`📹 Video: ${ad.videoUrl}`);
  logMsg(`🖼️ Poster: ${ad.posterUrl}`);

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
    postToDiscord: (method === 'share_now'),
    postToYouTube: postYouTube && (method === 'share_now'),
    youtubeTitle: 'Living Document (.ldocx) — ' + ad.title,
    youtubeDescription: ad.linkedin,
    youtubePrivacy: 'public'
  });

  const todayStr = new Date().toISOString().split('T')[0];
  state.lastRunDate = todayStr;
  state.totalBroadcasts++;
  state.history.push({
    date: todayStr,
    timestamp: new Date().toISOString(),
    index: ad.index,
    id: ad.id,
    title: ad.title,
    method,
    results: results.map(r => ({ channel: r.channel, status: r.error ? 'failed' : 'success' }))
  });

  let nextIdx = ad.index + 1;
  if (nextIdx > catalog.length) {
    nextIdx = 1;
    state.currentCycle++;
    logMsg(`🔄 Completed full rotation of all ${catalog.length} ads! Advanced to Cycle ${state.currentCycle}.`);
  }
  state.nextAdIndex = nextIdx;
  saveState();

  logMsg(`✅ Successfully processed Ad ${ad.index}! Next scheduled ad is Ad ${state.nextAdIndex}.`);
  return results;
}

async function queueUpcomingAds(count = 3) {
  logMsg(`🚀 Pre-queueing the next ${count} ads into Buffer queue with full 2K video attachments...`);
  for (let i = 0; i < count; i++) {
    const cur = state.nextAdIndex;
    logMsg(`\n>>> Pre-queueing slot ${i + 1}/${count} (Ad Index ${cur})...`);
    await postAdByIndex(cur, 'queue', { postYouTube: false });
    await new Promise(r => setTimeout(r, 3000));
  }
  logMsg(`\n🌟 Pre-queueing complete! Future posts are scheduled in Buffer with native video attachments.`);
}

async function runDaemon() {
  logMsg('🤖 Autonomous Ad Scheduler Daemon started. Monitoring daily schedule...');
  logMsg(`Next ad in queue: Ad ${state.nextAdIndex} ("${catalog.find(a => a.index === state.nextAdIndex)?.title}")`);

  async function checkAndRun() {
    const todayStr = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();

    if (state.lastRunDate !== todayStr && hour >= 9) {
      logMsg(`⏰ Daily schedule trigger activated for ${todayStr} (Hour: ${hour}). Dispatching next ad...`);
      try {
        await postAdByIndex(state.nextAdIndex, 'share_now', { postYouTube: true });
      } catch (err) {
        logMsg(`❌ Daily dispatch failed: ${err.message}`);
      }
    } else {
      logMsg(`💤 Heartbeat: Already posted today (${state.lastRunDate}) or waiting for 09:00 AM window. Next ad: ${state.nextAdIndex}.`);
    }
  }

  await checkAndRun();
  setInterval(checkAndRun, 30 * 60 * 1000);
}

function showStatus() {
  console.log('===============================================================');
  console.log('📊 UNIFIED 2K VIDEO ADS SCHEDULER STATUS');
  console.log('===============================================================');
  console.log(`Current Cycle:    ${state.currentCycle}`);
  console.log(`Next Ad Index:    ${state.nextAdIndex} OF ${catalog.length}`);
  console.log(`Last Run Date:    ${state.lastRunDate || 'None'}`);
  console.log(`Total Broadcasts: ${state.totalBroadcasts}`);
  console.log('---------------------------------------------------------------');
  console.log('Upcoming Ad:');
  const nextAd = catalog.find(a => a.index === state.nextAdIndex);
  if (nextAd) {
    console.log(`  Title:  ${nextAd.title}`);
    console.log(`  Suite:  ${nextAd.suite.toUpperCase()}`);
    console.log(`  Length: ${nextAd.length}`);
    console.log(`  Angle:  ${nextAd.angle}`);
    console.log(`  Video:  ${nextAd.videoUrl}`);
  }
  console.log('---------------------------------------------------------------');
  console.log('Full 8-Ad Catalog Rotation:');
  catalog.forEach(a => {
    const marker = (a.index === state.nextAdIndex) ? '👉 NEXT' : '  ';
    console.log(`${marker} [Ad ${a.index}] ${a.title} (${a.length})`);
  });
  console.log('===============================================================');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    showStatus();
    return;
  }

  if (args.includes('--queue-future')) {
    const qIdx = args.indexOf('--queue-future');
    const count = (qIdx !== -1 && args[qIdx + 1] && !args[qIdx + 1].startsWith('--')) ? parseInt(args[qIdx + 1], 10) : 3;
    await queueUpcomingAds(count);
    return;
  }

  if (args.includes('--daemon')) {
    await runDaemon();
    return;
  }

  if (args.includes('--post-next')) {
    const postYouTube = !args.includes('--no-youtube');
    await postAdByIndex(state.nextAdIndex, 'share_now', { postYouTube });
    return;
  }

  if (args.includes('--ad')) {
    const targetIdx = parseInt(args[args.indexOf('--ad') + 1], 10);
    const method = args.includes('--queue') ? 'queue' : 'share_now';
    const postYouTube = !args.includes('--no-youtube');
    await postAdByIndex(targetIdx, method, { postYouTube });
    return;
  }

  showStatus();
  console.log('\nUsage:');
  console.log('  node scripts/auto-ad-scheduler.js --post-next [--no-youtube]');
  console.log('  node scripts/auto-ad-scheduler.js --queue-future [count]');
  console.log('  node scripts/auto-ad-scheduler.js --ad <1-8> [--queue|--share-now]');
  console.log('  node scripts/auto-ad-scheduler.js --daemon');
  console.log('  node scripts/auto-ad-scheduler.js --status');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal scheduler error:', err);
    process.exit(1);
  });
}

module.exports = { postAdByIndex, queueUpcomingAds, catalog };
