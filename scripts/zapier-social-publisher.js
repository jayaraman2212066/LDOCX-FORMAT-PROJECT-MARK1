// scripts/zapier-social-publisher.js
// Automated Multi-Channel Social Media Publisher via Zapier MCP (Buffer / LinkedIn / Threads)
const fs = require('fs');
const path = require('path');

const tokenPath = 'C:/Users/JAYARAMAN K/.gemini/mcp-oauth-tokens.json';

async function getZapierToken() {
  if (!fs.existsSync(tokenPath)) {
    throw new Error('MCP OAuth tokens file not found. Please authenticate first via Gemini CLI.');
  }
  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const zapierEntry = tokens.find(t => t.serverName === 'zapier');
  if (!zapierEntry || !zapierEntry.token || !zapierEntry.token.accessToken) {
    throw new Error('Zapier OAuth access token not found in ' + tokenPath);
  }
  return zapierEntry.token.accessToken;
}

async function callZapierTool(toolName, args, token) {
  const res = await fetch('https://mcp.zapier.com/api/v1/connect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    })
  });

  const text = await res.text();
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const parsed = JSON.parse(line.slice(6));
      return parsed.result;
    }
  }
  return { text };
}

const CHANNELS = {
  LINKEDIN: { id: '6a9bd713065799be46921774', name: 'LinkedIn (jayaramankalidasan)' },
  THREADS: { id: '6a9bd6f6065799be46921721', name: 'Threads (j_a_i_enterprise)' }
};
const ORGANIZATION_ID = '6a9bd30fb1db4222ba656ba8';

async function publishSinglePost({ linkedinText, threadsText, imageUrl, method = 'queue' }) {
  const token = await getZapierToken();
  const results = [];

  // 1. Dispatch to LinkedIn
  try {
    console.log(`? Queueing to ${CHANNELS.LINKEDIN.name}...`);
    const lRes = await callZapierTool('buffer_add_to_queue', {
      output_hint: 'id, text, status, channel',
      organizationId: ORGANIZATION_ID,
      channelId: CHANNELS.LINKEDIN.id,
      method,
      dynamic_properties: {
        text: linkedinText,
        attachment: 'image',
        image: imageUrl,
        image_alttext: 'Living Document (.ldocx) Technical Showcase'
      }
    }, token);
    console.log(`? Success for LinkedIn`);
    results.push({ channel: CHANNELS.LINKEDIN.name, result: lRes });
  } catch (e) {
    console.error(`? Error for LinkedIn:`, e.message);
    results.push({ channel: CHANNELS.LINKEDIN.name, error: e.message });
  }

  // 2. Dispatch to Threads (ensuring under 500 characters)
  try {
    console.log(`? Queueing to ${CHANNELS.THREADS.name}...`);
    let tText = threadsText || linkedinText;
    if (tText.length > 480) {
      tText = tText.slice(0, 470) + '...\n\n?? https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT';
    }

    const tRes = await callZapierTool('buffer_add_to_queue', {
      output_hint: 'id, text, status, channel',
      organizationId: ORGANIZATION_ID,
      channelId: CHANNELS.THREADS.id,
      method,
      dynamic_properties: {
        text: tText,
        attachment: 'image',
        image: imageUrl,
        image_alttext: 'Living Document (.ldocx) Technical Showcase'
      }
    }, token);
    console.log(`? Success for Threads`);
    results.push({ channel: CHANNELS.THREADS.name, result: tRes });
  } catch (e) {
    console.error(`? Error for Threads:`, e.message);
    results.push({ channel: CHANNELS.THREADS.name, error: e.message });
  }

  return results;
}

// Publish entire batch of 5 daily posts into Buffer queue
async function publishDaily5Batch(posts, method = 'queue') {
  console.log(`\n?? Starting Daily 5-Post Multi-Channel Promotion Batch (method: ${method})...\n`);
  const batchResults = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n--- Dispatching Post ${i + 1}/5: ${post.slot} ---`);
    console.log(`?? Angle: ${post.angle}`);
    const res = await publishSinglePost({
      linkedinText: post.linkedin,
      threadsText: post.threads,
      imageUrl: post.imageUrl,
      method
    });
    batchResults.push({ slot: post.slot, angle: post.angle, results: res });
    // Small pause between queue calls for clean rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n?? All 5 daily promotion posts queued successfully into Buffer!`);
  return batchResults;
}

async function publishCampaign({ text, imageUrl, method = 'queue' }) {
  return publishSinglePost({ linkedinText: text, threadsText: text, imageUrl, method });
}

module.exports = {
  publishCampaign,
  publishSinglePost,
  publishDaily5Batch
};
