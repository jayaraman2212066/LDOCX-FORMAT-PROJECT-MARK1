// scripts/zapier-social-publisher.js
// Automated Multi-Channel Social Media Publisher via Zapier MCP
// Broadcasts to: LinkedIn, Threads, Instagram (via Buffer) & Discord (#general)

const fs = require('fs');
const path = require('path');

const tokenPath = 'C:/Users/JAYARAMAN K/.gemini/mcp-oauth-tokens.json';

async function refreshZapierToken(zapierEntry, tokens) {
  try {
    const refreshToken = zapierEntry.token && zapierEntry.token.refreshToken;
    const clientId = zapierEntry.clientId;
    const tokenUrl = zapierEntry.tokenUrl || 'https://mcp.zapier.com/api/v1/oauth/token';
    if (!refreshToken || !clientId) return zapierEntry.token.accessToken;

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        zapierEntry.token.accessToken = data.access_token;
        zapierEntry.token.expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
        if (data.refresh_token) zapierEntry.token.refreshToken = data.refresh_token;
        zapierEntry.updatedAt = Date.now();
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), 'utf8');
        console.log('🔄 Successfully auto-refreshed Zapier OAuth access token.');
      }
    }
  } catch (err) {
    console.warn('⚠️ Token auto-refresh attempt skipped:', err.message);
  }
  return zapierEntry.token.accessToken;
}

async function getZapierToken() {
  if (!fs.existsSync(tokenPath)) {
    throw new Error('MCP OAuth tokens file not found. Please authenticate first via Gemini CLI.');
  }
  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const zapierEntry = tokens.find(t => t.serverName === 'zapier');
  if (!zapierEntry || !zapierEntry.token || !zapierEntry.token.accessToken) {
    throw new Error('Zapier OAuth access token not found in ' + tokenPath);
  }

  // Auto-refresh if token is within 2 minutes of expiry
  if (zapierEntry.token.expiresAt && Date.now() > (zapierEntry.token.expiresAt - 120000)) {
    return await refreshZapierToken(zapierEntry, tokens);
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
      const resObj = parsed.result;
      if (resObj && resObj.isError) {
        let errMsg = 'Zapier tool execution failed';
        if (resObj.content && resObj.content[0] && resObj.content[0].text) {
          try {
            const inner = JSON.parse(resObj.content[0].text);
            errMsg = inner.error || resObj.content[0].text;
          } catch (e) {
            errMsg = resObj.content[0].text;
          }
        }
        throw new Error(errMsg);
      }
      return resObj;
    }
  }
  return { text };
}

const BUFFER_ORG_ID = '6a9bd30fb1db4222ba656ba8';
const CHANNELS = {
  LINKEDIN: { id: '6a9bd713065799be46921774', name: 'LinkedIn (jayaramankalidasan)' },
  THREADS: { id: '6a9bd6f6065799be46921721', name: 'Threads (j_a_i_enterprise)' },
  INSTAGRAM: { id: '6a9bd607065799be4692146f', name: 'Instagram (j_a_i_enterprise)' }
};

const DISCORD = {
  CHANNEL_ID: '1400086178606350337',
  NAME: 'Discord (#general)'
};

async function publishSinglePost({
  linkedinText,
  threadsText,
  instagramText,
  discordText,
  imageUrl,
  videoUrl,
  method = 'queue',
  postToDiscord = false,
  postToYouTube = false,
  youtubeTitle,
  youtubeDescription,
  youtubePrivacy = 'public',
  youtubeTags
}) {
  const token = await getZapierToken();
  const results = [];

  // 1. Dispatch to LinkedIn (Buffer)
  try {
    console.log(`📤 Dispatching to ${CHANNELS.LINKEDIN.name} [${method}] (Media: ${videoUrl ? 'Video' : 'Image'})...`);
    const dynamic_properties = videoUrl ? {
      text: linkedinText,
      attachment: 'video',
      video: videoUrl
    } : {
      text: linkedinText,
      attachment: 'image',
      image: imageUrl,
      image_alttext: 'Living Document (.ldocx) Technical Showcase'
    };

    const lRes = await callZapierTool('buffer_add_to_queue', {
      output_hint: 'id, text, status, channel',
      organizationId: BUFFER_ORG_ID,
      channelId: CHANNELS.LINKEDIN.id,
      method,
      dynamic_properties
    }, token);
    console.log(`✅ Success for LinkedIn`);
    results.push({ channel: CHANNELS.LINKEDIN.name, result: lRes });
  } catch (e) {
    console.error(`❌ Error for LinkedIn:`, e.message);
    results.push({ channel: CHANNELS.LINKEDIN.name, error: e.message });
  }

  // 2. Dispatch to Threads (Buffer - 500 char safe limit)
  try {
    console.log(`📤 Dispatching to ${CHANNELS.THREADS.name} [${method}] (Media: ${videoUrl ? 'Video' : 'Image'})...`);
    let tText = threadsText || linkedinText;
    if (tText.length > 480) {
      tText = tText.slice(0, 470) + '...\n\n👉 https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT';
    }

    const dynamic_properties = videoUrl ? {
      text: tText,
      attachment: 'video',
      video: videoUrl
    } : {
      text: tText,
      attachment: 'image',
      image: imageUrl,
      image_alttext: 'Living Document (.ldocx) Technical Showcase'
    };

    const tRes = await callZapierTool('buffer_add_to_queue', {
      output_hint: 'id, text, status, channel',
      organizationId: BUFFER_ORG_ID,
      channelId: CHANNELS.THREADS.id,
      method,
      dynamic_properties
    }, token);
    console.log(`✅ Success for Threads`);
    results.push({ channel: CHANNELS.THREADS.name, result: tRes });
  } catch (e) {
    console.error(`❌ Error for Threads:`, e.message);
    results.push({ channel: CHANNELS.THREADS.name, error: e.message });
  }

  // 3. Dispatch to Instagram (Buffer)
  try {
    console.log(`📤 Dispatching to ${CHANNELS.INSTAGRAM.name} [${method}] (Media: ${videoUrl ? 'Reels Video' : 'Image'})...`);
    const igText = instagramText || linkedinText;

    const dynamic_properties = videoUrl ? {
      ig_post_type: 'reels',
      video: videoUrl,
      ig_share_to_feed: 'true',
      text: igText,
      scheduling_type: 'direct'
    } : {
      ig_post_type: 'post',
      attachment: 'image',
      image: imageUrl,
      image_alttext: 'Living Document (.ldocx) Technical Showcase',
      text: igText,
      scheduling_type: 'direct'
    };

    const igRes = await callZapierTool('buffer_add_to_queue', {
      output_hint: 'id, text, status, channel',
      organizationId: BUFFER_ORG_ID,
      channelId: CHANNELS.INSTAGRAM.id,
      method,
      dynamic_properties
    }, token);
    console.log(`✅ Success for Instagram`);
    results.push({ channel: CHANNELS.INSTAGRAM.name, result: igRes });
  } catch (e) {
    console.error(`❌ Error for Instagram:`, e.message);
    results.push({ channel: CHANNELS.INSTAGRAM.name, error: e.message });
  }

  // 4. Dispatch to Discord (Direct Zapier MCP)
  if (postToDiscord && discordText) {
    try {
      console.log(`📤 Dispatching live announcement to ${DISCORD.NAME}...`);
      const discordArgs = {
        output_hint: 'id, content, channel_id',
        channel_id: DISCORD.CHANNEL_ID,
        username: 'Living Document (.ldocx) Herald',
        avatar_url: imageUrl,
        content: discordText
      };
      // Discord API limit for bot file uploads is 25MB.
      // Direct raw .mp4 links in the text content automatically trigger Discord's native 2K video player embed.
      // We pass the raw video link in discordText to enable streamable video playback without hitting upload caps.
      const dRes = await callZapierTool('discord_send_channel_message', discordArgs, token);
      console.log(`✅ Success for Discord`);
      results.push({ channel: DISCORD.NAME, result: dRes });
    } catch (e) {
      console.error(`❌ Error for Discord:`, e.message);
      results.push({ channel: DISCORD.NAME, error: e.message });
    }
  }

  // 5. Dispatch to YouTube (Direct Zapier MCP)
  if (postToYouTube && videoUrl) {
    try {
      console.log(`📤 Dispatching video upload to YouTube...`);
      const ytArgs = {
        output_hint: 'id, title, status',
        title: (youtubeTitle || 'Living Document (.ldocx)').slice(0, 100),
        description: (youtubeDescription || linkedinText || '').slice(0, 4900) + '\n\n👉 GitHub: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT',
        video: videoUrl,
        category_id: '28', // Science & Technology
        privacy_status: youtubePrivacy || 'public',
        made_for_kids: false,
        tags: youtubeTags || ['ldocx', 'living document', 'tech', 'software', 'engineering', 'cryptography', 'webgl']
      };
      if (imageUrl) {
        ytArgs.thumbnail = imageUrl;
      }
      const ytRes = await callZapierTool('youtube_upload_video', ytArgs, token);
      console.log(`✅ Success for YouTube`);
      results.push({ channel: 'YouTube', result: ytRes });
    } catch (e) {
      console.error(`❌ Error for YouTube:`, e.message);
      results.push({ channel: 'YouTube', error: e.message });
    }
  }

  return results;
}

// Publish entire batch of 5 daily posts into Buffer & broadcast featured launch to Discord
async function publishDaily5Batch(posts, method = 'queue') {
  console.log(`\n🚀 Starting Daily 5-Post Multi-Channel Promotion Batch (method: ${method})...`);
  console.log(`📢 Channels Targeted:`);
  console.log(`   1. LinkedIn (jayaramankalidasan)`);
  console.log(`   2. Threads (@j_a_i_enterprise)`);
  console.log(`   3. Instagram (@j_a_i_enterprise)`);
  console.log(`   4. Discord (#general)\n`);

  const batchResults = [];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n--- Dispatching Slot ${i + 1}/5: ${post.slot} ---`);
    console.log(`💡 Angle: ${post.angle}`);

    // Always post the morning featured kickoff (Post 1) to Discord live
    // If method is 'share_now', all posts are posted live everywhere
    const postToDiscord = (i === 0) || (method === 'share_now');

    const res = await publishSinglePost({
      linkedinText: post.linkedin,
      threadsText: post.threads,
      instagramText: post.instagram,
      discordText: post.discord,
      imageUrl: post.imageUrl,
      method,
      postToDiscord
    });

    batchResults.push({ slot: post.slot, angle: post.angle, results: res });
    // Rate limit delay between queue calls
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n🎉 All 5 daily promotion posts queued across LinkedIn, Threads, Instagram & broadcasted to Discord!`);
  return batchResults;
}

async function publishCampaign({ text, imageUrl, method = 'queue' }) {
  return publishSinglePost({
    linkedinText: text,
    threadsText: text,
    instagramText: text,
    discordText: text,
    imageUrl,
    method,
    postToDiscord: true
  });
}

module.exports = {
  publishCampaign,
  publishSinglePost,
  publishDaily5Batch,
  getZapierToken,
  callZapierTool,
  CHANNELS,
  DISCORD
};
