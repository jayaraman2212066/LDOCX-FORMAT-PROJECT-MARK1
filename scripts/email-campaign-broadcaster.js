// scripts/email-campaign-broadcaster.js
// Automated Email Campaign Broadcaster via Zapier MCP (Gmail)
// Broadcasts Living Document (.ldocx) 2K Quad HD Video Ads & Announcements
// To: SSN College Engineering Batches (IT, CSE, ECE, EEE, MECH, BME, CHEM, CIVIL)
// CC: Referral — jayaraman2212066@ssn.edu.in

const fs = require('fs');
const path = require('path');
const { getZapierToken, callZapierTool } = require('./zapier-social-publisher');

const catalogPath = path.resolve(__dirname, 'unified-ads-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const RECIPIENTS = {
  TO: [
    // SSN Information Technology (IT) Batches
    'ug2024-it@ssn.edu.in',
    'ug2025-it@ssn.edu.in',
    'pg2024-it@ssn.edu.in',
    'pg2025-it@ssn.edu.in',

    // SSN Computer Science & Engineering (CSE) Batches
    'ug2022-cse@ssn.edu.in',
    'ug2024-cse@ssn.edu.in',
    'ug2025-cse@ssn.edu.in',
    'pg2024-cse@ssn.edu.in',
    'pg2025-cse@ssn.edu.in',

    // SSN Electronics & Communication Engineering (ECE) Batches
    'ug2024-ece@ssn.edu.in',
    'ug2025-ece@ssn.edu.in',

    // SSN Electrical & Electronics Engineering (EEE) Batches
    'ug2024-eee@ssn.edu.in',
    'ug2025-eee@ssn.edu.in',

    // SSN Mechanical Engineering (MECH) Batches
    'ug2024-mech@ssn.edu.in',
    'ug2025-mech@ssn.edu.in',

    // SSN Chemical Engineering (CHEM) Batches
    'ug2024-chem@ssn.edu.in',
    'ug2025-chem@ssn.edu.in',

    // SSN Civil Engineering (CIVIL) Batches
    'ug2024-civil@ssn.edu.in',
    'ug2025-civil@ssn.edu.in'
  ],
  CC: [
    'jayaraman2212066@ssn.edu.in'
  ],
  REFERRAL_EMAIL: 'jayaraman2212066@ssn.edu.in',
  REFERRAL_NAME: 'Jayaraman K (IT Department, SSN College of Engineering)',
  GITHUB_URL: 'https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT',
  DOCS_URL: 'https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT#readme'
};

function generateEmailHtml(ad) {
  const localVideoPath = path.resolve(__dirname, '..', 'public', 'ads', `${ad.id}.mp4`);
  let isVideoAttached = false;
  if (fs.existsSync(localVideoPath)) {
    const sizeMb = fs.statSync(localVideoPath).size / (1024 * 1024);
    if (sizeMb <= 24.5) isVideoAttached = true;
  }

  const primaryPlayUrl = ad.youtubeUrl || ad.videoUrl;
  const primaryPlayText = ad.youtubeUrl ? `▶️ Watch on YouTube (2K Quad HD)` : `🎬 Stream 2K Quad HD Video (${ad.length})`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ad.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-bottom: 1px solid #374151;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #38bdf8;">LDOC STUDIO</span>
                    <span style="font-size: 13px; color: #94a3b8; margin-left: 8px; font-weight: 500;">Living Document Format (.ldocx)</span>
                  </td>
                  <td align="right">
                    <span style="background-color: #0369a1; color: #f0f9ff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">Ad Spotlight</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Poster Image Banner -->
          <tr>
            <td style="padding: 0; line-height: 0;">
              <a href="${primaryPlayUrl}" target="_blank" style="display: block;">
                <img src="${ad.posterUrl}" alt="${ad.title}" style="width: 100%; max-width: 600px; height: auto; display: block; border: 0;" />
              </a>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                ${ad.title}
              </h1>
              
              <p style="font-size: 14px; color: #38bdf8; font-weight: 600; margin: 0 0 16px 0;">
                💡 ${ad.angle}
              </p>

              <div style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 24px; white-space: pre-line;">
${ad.linkedin.split('\n\n#')[0]}
              </div>

              <!-- CTA Button: Watch Video -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="${primaryPlayUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4); text-align: center;">
                      ${primaryPlayText}
                    </a>
                  </td>
                </tr>
              </table>

              ${isVideoAttached ? `
              <!-- Direct Attachment Notice -->
              <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 12px 16px; margin: 16px 0 20px 0; text-align: center;">
                <span style="font-size: 13px; color: #34d399; font-weight: 600;">
                  📎 Direct Video Attached: The full 2K Quad HD video (${ad.length}) is attached to this email for direct offline playback.
                </span>
              </div>
              ` : ''}

              <!-- Project Superpowers Grid -->
              <div style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 20px; margin-top: 24px;">
                <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.5px;">
                  ⚡ Why .ldocx is Revolutionizing Documentation:
                </h3>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #94a3b8;">
                  <li><strong style="color: #e2e8f0;">Hardware-Accelerated 3D WebGL:</strong> Orbit and zoom real 3D CAD meshes at 60 FPS directly on the page.</li>
                  <li><strong style="color: #e2e8f0;">Executable Code Sandboxes:</strong> Run live JavaScript and Python scripts with instant reactive recalculations.</li>
                  <li><strong style="color: #e2e8f0;">Cryptographic SHA-256 Merkle Trees:</strong> Every block sealed with Ed25519 signatures &lt;15ms tamper alarms.</li>
                  <li><strong style="color: #e2e8f0;">100% Offline-First:</strong> Zero cloud lock-in, zero mandatory accounts, opens instantly on any device.</li>
                </ul>
              </div>

              <!-- Quick Links -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 20px;">
                <tr>
                  <td align="center">
                    <a href="${RECIPIENTS.GITHUB_URL}" target="_blank" style="color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 600; margin: 0 12px;">⭐ GitHub Repository</a>
                    <span style="color: #475569;">•</span>
                    <a href="${RECIPIENTS.DOCS_URL}" target="_blank" style="color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 600; margin: 0 12px;">📖 Technical Docs</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Referral Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0a0e17; border-top: 1px solid #1f2937; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 6px 0; color: #94a3b8;">
                <strong>Referral Contact:</strong> ${RECIPIENTS.REFERRAL_NAME}
              </p>
              <p style="margin: 0 0 6px 0;">
                Email: <a href="mailto:${RECIPIENTS.REFERRAL_EMAIL}" style="color: #38bdf8; text-decoration: none;">${RECIPIENTS.REFERRAL_EMAIL}</a> (CC'd for questions, feedback, or collaborations)
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                Sent via LDOC Studio Automated Engineering Showcase Pipeline. Open-source research & development.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function broadcastAdEmail(adIndex, { isTest = false } = {}) {
  const ad = catalog.find(a => a.index === adIndex);
  if (!ad) throw new Error('Ad not found with index ' + adIndex);

  const token = await getZapierToken();
  const subject = `🚀 [LDOCX Showcase] ${ad.title} — Living Document Format`;
  const htmlBody = generateEmailHtml(ad);

  const toList = isTest ? [RECIPIENTS.REFERRAL_EMAIL] : RECIPIENTS.TO;
  const ccList = isTest ? [] : RECIPIENTS.CC;

  // Determine if video can be attached directly (Gmail 25MB attachment limit)
  // Prefers high-efficiency 9:16 vertical short (2-6MB) which is guaranteed < 25MB
  const localShortPath = path.resolve(__dirname, '..', 'public', 'shorts', `short_${ad.id}.mp4`);
  const localVideoPath = path.resolve(__dirname, '..', 'public', 'ads', `${ad.id}.mp4`);
  let attachUrl = null;

  if (ad.shortsVideoUrl && fs.existsSync(localShortPath)) {
    attachUrl = ad.shortsVideoUrl;
  } else if (ad.videoUrl && fs.existsSync(localVideoPath)) {
    const sizeMb = fs.statSync(localVideoPath).size / (1024 * 1024);
    if (sizeMb <= 24.5) {
      attachUrl = ad.videoUrl;
    }
  }

  const shouldAttach = Boolean(attachUrl);

  console.log('\n===============================================================');
  console.log(`📧 BROADCASTING AD ${ad.index} VIA ZAPIER GMAIL`);
  console.log(`🎯 Subject: "${subject}"`);
  console.log(`📬 To (${toList.length}): ${toList.join(', ')}`);
  if (ccList.length > 0) {
    console.log(`📋 CC (Referral): ${ccList.join(', ')}`);
  }
  console.log(`📹 Video CDN: ${ad.videoUrl}`);
  if (ad.shortsVideoUrl) {
    console.log(`📱 Shorts 9:16 CDN: ${ad.shortsVideoUrl}`);
  }
  console.log(`🖼️ Poster CDN: ${ad.posterUrl}`);
  if (ad.youtubeUrl) {
    console.log(`▶️ YouTube: ${ad.youtubeUrl}`);
  }
  console.log(`📎 Video Attachment: ${shouldAttach ? `YES (${attachUrl})` : 'NO (> 25MB, Streamed via CDN/YouTube)'}`);
  console.log('===============================================================\n');

  const args = {
    output_hint: 'id, thread_id, to, subject',
    to: toList,
    subject: subject,
    body_type: 'html',
    body: htmlBody,
    from_name: 'Jayaraman K | Living Document (.ldocx)',
    reply_to: RECIPIENTS.REFERRAL_EMAIL
  };

  if (ccList.length > 0) {
    args.cc = ccList;
  }

  if (shouldAttach) {
    args.file = [attachUrl];
  }

  const res = await callZapierTool('gmail_send_email', args, token);
  console.log('✅ Email broadcast successfully sent via Gmail!');
  return res;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--preview')) {
    const pIdx = args.indexOf('--preview');
    const idx = parseInt(args[pIdx + 1] || '1', 10);
    const ad = catalog.find(a => a.index === idx);
    console.log(generateEmailHtml(ad));
    return;
  }

  if (args.includes('--test')) {
    const tIdx = args.indexOf('--test');
    const idx = (tIdx !== -1 && args[tIdx + 1] && !args[tIdx + 1].startsWith('--')) ? parseInt(args[tIdx + 1], 10) : 1;
    await broadcastAdEmail(idx, { isTest: true });
    return;
  }

  let targetIdx = 1;
  const adIdx = args.indexOf('--ad');
  if (adIdx !== -1 && args[adIdx + 1]) {
    targetIdx = parseInt(args[adIdx + 1], 10);
  }

  await broadcastAdEmail(targetIdx, { isTest: false });
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal email broadcaster error:', err);
    process.exit(1);
  });
}

module.exports = { broadcastAdEmail, generateEmailHtml, RECIPIENTS };
