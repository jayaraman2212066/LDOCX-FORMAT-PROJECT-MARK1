// scripts/video-ad-promoter.js
// Automated 7-Day Video Ad Multi-Channel Showcase Engine
// Broadcasts to LinkedIn, Threads, Instagram (via Buffer) & Discord (#general)

const fs = require('fs');
const path = require('path');
const { publishSinglePost, CHANNELS, DISCORD } = require('./zapier-social-publisher');

const calendarPath = path.resolve(__dirname, 'video-campaign-calendar.json');
const statePath = path.resolve(__dirname, 'video-promo-state.json');

if (!fs.existsSync(calendarPath)) {
  console.error('ERROR: video-campaign-calendar.json not found!');
  process.exit(1);
}

const calendar = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));

let state = {
  currentCycle: 1,
  lastRunDate: null,
  completedDays: [],
  history: []
};

if (fs.existsSync(statePath)) {
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (e) {}
}

async function promoteVideoDay(dayNumber, method = 'queue') {
  const campaign = calendar.find(c => c.dayNumber === dayNumber);
  if (!campaign) {
    throw new Error(`Video campaign for Day ${dayNumber} not found!`);
  }

  console.log(`\n===============================================================`);
  console.log(`🎬 BROADCASTING VIDEO AD DAY ${campaign.dayNumber} OF 7: "${campaign.theme}"`);
  console.log(`💡 Headline: "${campaign.headline}"`);
  console.log(`📹 Video URL: ${campaign.videoUrl}`);
  console.log(`🖼️ Poster URL: ${campaign.posterUrl}`);
  console.log(`===============================================================\n`);

  // Dispatch to all 4 channels (LinkedIn, Threads, Instagram, and Discord)
  const results = await publishSinglePost({
    linkedinText: campaign.linkedin,
    threadsText: campaign.threads,
    instagramText: campaign.instagram,
    discordText: campaign.discord,
    imageUrl: campaign.posterUrl,
    videoUrl: campaign.videoUrl,
    method,
    postToDiscord: true
  });

  // Update State
  const todayStr = new Date().toISOString().split('T')[0];
  state.lastRunDate = todayStr;
  if (!state.completedDays.includes(dayNumber)) {
    state.completedDays.push(dayNumber);
  }
  state.history.push({
    date: todayStr,
    dayNumber,
    theme: campaign.theme,
    adId: campaign.adId,
    method
  });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  console.log(`\n🎉 Video Ad Day ${dayNumber} successfully processed and recorded!`);
  return results;
}

// Queue all 7 days into Buffer schedule
async function queueAll7Days() {
  console.log(`\n🚀 Starting 7-Day Video Ad Multi-Channel Automated Pipeline...`);
  console.log(`📢 Channels: LinkedIn, Threads, Instagram, and Discord`);
  
  for (let day = 1; day <= 7; day++) {
    console.log(`\n>>> Scheduling Video Ad Day ${day}/7...`);
    // Day 1 can be shared now or queued; subsequent days are queued
    const method = (day === 1) ? 'share_now' : 'queue';
    await promoteVideoDay(day, method);
    // Rate limit delay between multi-channel queue dispatches
    await new Promise(r => setTimeout(r, 2500));
  }

  console.log(`\n🌟 ALL 7 VIDEO ADS SCHEDULED ACROSS ALL PLATFORMS!`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--all') || args.includes('--queue-7-days')) {
    await queueAll7Days();
    return;
  }

  let targetDay = null;
  const dayArgIdx = args.indexOf('--day');
  if (dayArgIdx !== -1 && args[dayArgIdx + 1]) {
    targetDay = parseInt(args[dayArgIdx + 1], 10);
  } else {
    // Determine next unfinished day
    for (let d = 1; d <= 7; d++) {
      if (!state.completedDays.includes(d)) {
        targetDay = d;
        break;
      }
    }
    if (!targetDay) targetDay = 1; // Cycle back if all completed
  }

  const method = args.includes('--share-now') ? 'share_now' : 'queue';
  await promoteVideoDay(targetDay, method);
}

main().catch(err => {
  console.error('Fatal video promoter error:', err);
  process.exit(1);
});
