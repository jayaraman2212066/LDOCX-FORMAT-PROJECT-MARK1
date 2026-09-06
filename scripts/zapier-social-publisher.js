// scripts/zapier-social-publisher.js
// Automated Social Media Publisher via Zapier MCP (Buffer / LinkedIn / Threads)
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

async function publishCampaign({ text, imageUrl, method = 'draft' }) {
  const token = await getZapierToken();
  const organizationId = '6a9bd30fb1db4222ba656ba8';
  
  const channels = [
    { id: '6a9bd713065799be46921774', name: 'LinkedIn (jayaramankalidasan)' },
    { id: '6a9bd6f6065799be46921721', name: 'Threads (j_a_i_enterprise)' }
  ];

  const results = [];

  for (const ch of channels) {
    console.log(`⏳ Publishing to ${ch.name} [method: ${method}]...`);
    try {
      let channelText = text;
      // Threads limit is 500 characters
      if (ch.name.includes('Threads') && channelText.length > 480) {
        channelText = `Stop sending flat PDFs in 2026. 🛑\n\nWhy send a 33-year-old printer format when you can send a Living Document (.ldocx)?\n🧊 Full 3D CAD & mesh models in 60 FPS\n📊 Live reactive datasets & charts\n🛡️ SHA-256 Merkle tree verification\n⚡ 3.7MB lightweight native viewer (Win/Linux/iOS)\n\n100% Free & Open-Source.\n\nDownload: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/tag/v2.5.0-free\nSDK: npm install ldoc-sdk\n\n#TechNews #OpenSource #3D #WebDev`;
      }

      const res = await callZapierTool('buffer_add_to_queue', {
        output_hint: 'id, text, status, channel',
        organizationId,
        channelId: ch.id,
        method,
        dynamic_properties: {
          text: channelText,
          attachment: 'image',
          image: imageUrl,
          image_alttext: 'Living Document (.ldocx) Technical Architecture'
        }
      }, token);
      console.log(`✅ Success for ${ch.name}`);
      results.push({ channel: ch.name, result: res });
    } catch (e) {
      console.error(`❌ Error for ${ch.name}:`, e.message);
      results.push({ channel: ch.name, error: e.message });
    }
  }

  return results;
}

// Self-run when called directly
if (require.main === module) {
  const method = process.argv.includes('--share') ? 'share_now' : (process.argv.includes('--queue') ? 'queue' : 'draft');
  const sampleText = "Why are we still printing documents to glass? PDF was engineered for physical printers in 1993. The Living Document Format (.ldocx) introduces interactive 3D WebGL, reactive charts, and block-level cryptographic verification.\n\nCompare the specs and download our free 3.7MB native suite for Windows, Linux, and iOS:\nhttps://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/releases/tag/v2.5.0-free";
  const imageUrl = "https://raw.githubusercontent.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT/main/public/ldoc-promo-banner.jpg";

  publishCampaign({ text: sampleText, imageUrl, method }).then(res => {
    console.log('\n--- Final Broadcast Summary ---');
    console.log(JSON.stringify(res, null, 2));
  });
}

module.exports = { publishCampaign };
