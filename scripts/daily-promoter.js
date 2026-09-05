// scripts/daily-promoter.js
// Automated Daily Promotion Engine & Multi-Channel Ad Showcase System
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

const DEVTO_API_KEY = process.env.DEVTO_API_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || null;

// Paths
const calendarPath = path.resolve(__dirname, 'campaign-calendar.json');
const statePath = path.resolve(__dirname, 'promo-state.json');
const logsDir = path.resolve(__dirname, '..', 'logs');
const logFilePath = path.join(logsDir, 'daily-promotions.log');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

function logMessage(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(logFilePath, line, 'utf8');
}

// Load Campaign Calendar
if (!fs.existsSync(calendarPath)) {
  console.error('ERROR: campaign-calendar.json not found!');
  process.exit(1);
}
const campaigns = JSON.parse(fs.readFileSync(calendarPath, 'utf8'));

// Load or Initialize State
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

function postToDevTo(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: 'dev.to',
      port: 443,
      path: '/api/articles',
      method: 'POST',
      headers: {
        'api-key': DEVTO_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'LDOC-Daily-Promoter'
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`Dev.to API error (${res.statusCode}): ${JSON.stringify(json)}`));
          }
        } catch (e) {
          reject(new Error(`Dev.to HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function postWebhook(urlStr, payload) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const data = JSON.stringify(payload);
      const req = https.request({
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'LDOC-Daily-Promoter'
        }
      }, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function generateSocialLinks(campaign) {
  const tweetText = encodeURIComponent(campaign.social.twitter);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT')}`;

  const redditTitle = encodeURIComponent(campaign.social.reddit.title);
  const redditSub = campaign.social.reddit.subreddit;
  const redditUrl = `https://www.reddit.com/r/${redditSub}/submit?title=${redditTitle}&url=${encodeURIComponent('https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT')}`;

  const hnTitle = encodeURIComponent(campaign.social.hackernews.title);
  const hnUrl = `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(campaign.social.hackernews.url)}&t=${hnTitle}`;

  return { twitterUrl, linkedinUrl, redditUrl, hnUrl };
}

async function main() {
  const args = process.argv.slice(2);
  const isPreview = args.includes('--preview');
  const isStatus = args.includes('--status');
  const dayArgIdx = args.indexOf('--day');

  console.log('\n===============================================================');
  console.log('🌟 LIVING DOCUMENT FORMAT (.ldocx) — DAILY PROMOTION ENGINE 🌟');
  console.log('===============================================================\n');

  if (isStatus) {
    console.log(`Campaign Cycle: ${state.currentCycle}`);
    console.log(`Last Run Date:  ${state.lastRunDate || 'None'}`);
    console.log(`Completed Days: ${state.completedDays.join(', ') || 'None'}`);
    console.log(`History Count:  ${state.history.length} published promotions\n`);
    return;
  }

  // Determine which day to execute
  let targetDay = 1;
  if (dayArgIdx !== -1 && args[dayArgIdx + 1]) {
    targetDay = parseInt(args[dayArgIdx + 1], 10);
  } else {
    // If not specified, choose next uncompleted day or wrap around
    const completedSet = new Set(state.completedDays);
    const nextDayObj = campaigns.find(c => !completedSet.has(c.dayNumber));
    if (nextDayObj) {
      targetDay = nextDayObj.dayNumber;
    } else {
      // Completed all 7 days! Reset for next cycle
      state.currentCycle += 1;
      state.completedDays = [];
      targetDay = 1;
    }
  }

  const campaign = campaigns.find(c => c.dayNumber === targetDay) || campaigns[0];
  const links = generateSocialLinks(campaign);

  console.log(`📌 Active Campaign: Day ${campaign.dayNumber} of 7`);
  console.log(`🎯 Theme: ${campaign.theme}`);
  console.log(`💡 Headline: "${campaign.headline}"\n`);

  if (isPreview) {
    console.log('--- [PREVIEW MODE: No external API calls made] ---');
    console.log('\n📝 Dev.to Article Preview:');
    console.log(`Title: ${campaign.devto.title}`);
    console.log(`Tags:  ${campaign.devto.tags.join(', ')}`);
    console.log(`Desc:  ${campaign.devto.description}`);
    console.log('\n🐦 Twitter/X Copy:');
    console.log(campaign.social.twitter);
    console.log('\n💼 LinkedIn Copy:');
    console.log(campaign.social.linkedin);
    console.log(`\n🤖 Reddit (r/${campaign.social.reddit.subreddit}):`);
    console.log(`Title: ${campaign.social.reddit.title}`);
    console.log('\n🚀 1-Click Launch Links:');
    console.log(`- X (Twitter):  ${links.twitterUrl}`);
    console.log(`- LinkedIn:     ${links.linkedinUrl}`);
    console.log(`- Reddit:       ${links.redditUrl}`);
    console.log(`- Hacker News:  ${links.hnUrl}\n`);
    return;
  }

  // Execute Live Publish
  logMessage(`Starting automated promotion for Day ${campaign.dayNumber}: "${campaign.theme}"`);

  let devToResponse = null;
  if (DEVTO_API_KEY) {
    try {
      console.log('⏳ Publishing technical showcase article to Dev.to...');
      const devtoPayload = {
        article: {
          title: campaign.devto.title,
          published: true,
          tags: campaign.devto.tags,
          series: campaign.devto.series,
          canonical_url: `https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT#${campaign.id}`,
          description: campaign.devto.description,
          body_markdown: `---
title: ${campaign.devto.title}
published: true
tags: ${campaign.devto.tags.join(', ')}
series: ${campaign.devto.series}
canonical_url: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT#${campaign.id}
---

${campaign.devto.body}`
        }
      };

      devToResponse = await postToDevTo(devtoPayload);
      logMessage(`✅ Dev.to article live: ${devToResponse.url}`);
    } catch (err) {
      logMessage(`⚠️ Dev.to publication note: ${err.message}`);
    }
  } else {
    logMessage('ℹ️ DEVTO_API_KEY not found in .env; skipping automated Dev.to article.');
  }

  // Optional Webhook Push (Buffer / Zapier / Make / Slack / Discord)
  if (WEBHOOK_URL) {
    try {
      const webhookPayload = {
        campaignDay: campaign.dayNumber,
        theme: campaign.theme,
        headline: campaign.headline,
        devtoUrl: devToResponse ? devToResponse.url : (campaign.devto ? `https://dev.to/coder_jay_ai` : null),
        twitterCopy: campaign.social.twitter,
        linkedinCopy: campaign.social.linkedin,
        redditTitle: campaign.social.reddit.title,
        redditCopy: campaign.social.reddit.body,
        imageUrl: "https://raw.githubusercontent.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/main/public/ldoc-promo-banner.jpg",
        photo_url: "https://raw.githubusercontent.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/main/public/ldoc-promo-banner.jpg",
        media_url: "https://raw.githubusercontent.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/main/public/ldoc-promo-banner.jpg",
        caption: `${campaign.headline}\n\n${campaign.social.twitter}`,
        text: campaign.social.twitter,
        githubReleaseUrl: "https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/tag/v2.5.0-free",
        npmUrl: "https://www.npmjs.com/package/ldoc-sdk"
      };
      const wResult = await postWebhook(WEBHOOK_URL, webhookPayload);
      logMessage(`✅ Webhook successfully triggered (Status: ${wResult.statusCode})!`);
    } catch (wErr) {
      logMessage(`⚠️ Webhook error: ${wErr.message}`);
    }
  }

  // Update State
  const todayStr = new Date().toISOString().split('T')[0];
  state.lastRunDate = todayStr;
  if (!state.completedDays.includes(campaign.dayNumber)) {
    state.completedDays.push(campaign.dayNumber);
  }
  state.history.push({
    date: todayStr,
    dayNumber: campaign.dayNumber,
    theme: campaign.theme,
    devtoUrl: devToResponse ? devToResponse.url : null
  });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');

  console.log('\n===============================================================');
  console.log('🎉 TODAY\'S PROMOTION PUBLISHED & READY FOR BROADCAST!');
  console.log('===============================================================');
  if (devToResponse) {
    console.log(`\n📰 Live Article: ${devToResponse.url}`);
  }
  console.log('\n🌐 1-Click Social Media Broadcast Links:');
  console.log(`1. Post on X (Twitter):`);
  console.log(`   👉 ${links.twitterUrl}\n`);
  console.log(`2. Post on LinkedIn:`);
  console.log(`   👉 ${links.linkedinUrl}\n`);
  console.log(`3. Post on Reddit (r/${campaign.social.reddit.subreddit}):`);
  console.log(`   👉 ${links.redditUrl}\n`);
  console.log(`4. Post on Hacker News:`);
  console.log(`   👉 ${links.hnUrl}\n`);
  console.log(`📄 Execution log saved to: ${logFilePath}\n`);
}

main().catch(err => {
  console.error('Fatal promoter error:', err);
  process.exit(1);
});
