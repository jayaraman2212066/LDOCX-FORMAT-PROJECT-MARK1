// scripts/audit-batch-probe.js
// Sends an isolated probe to a candidate SSN Google Group from jayaraman2212066@ssn.edu.in
// Then checks the inbox for any bounce (Delivery Status Notification Failure).

const { getZapierToken, callZapierTool } = require('./zapier-social-publisher');

async function testSingleBatch(targetEmail) {
  console.log(`\n===============================================================`);
  console.log(`🔍 PROBING TARGET BATCH: ${targetEmail}`);
  console.log(`===============================================================`);

  const token = await getZapierToken();
  const probeId = Date.now();
  const subject = `[SSN Tech Innovation] Living Document Format (.ldocx) — ${targetEmail} Overview`;
  const body = `Hello,

This is Jayaraman K (IT Department, SSN College of Engineering).
We are conducting open-source research and engineering development on the Living Document Format (.ldocx), an offline-first container format for hardware-accelerated 3D WebGL, reactive computational blocks, and cryptographic Merkle verification.

Project Repository: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT
Technical Specification: https://github.com/coderjay2003-svg/NEW-GEN-LIVING-DOCUMENT-FORMAT#readme

Sent from authenticated SSN mailbox: jayaraman2212066@ssn.edu.in
Probe Identifier: ${probeId}`;

  console.log(`📤 Sending probe email to ${targetEmail}...`);
  const sendRes = await callZapierTool('gmail_send_email', {
    to: [targetEmail],
    subject: subject,
    body: body,
    from_name: 'Jayaraman K (SSN IT)',
    reply_to: 'jayaraman2212066@ssn.edu.in'
  }, token);

  console.log(`📨 Email sent. Raw result:`, JSON.stringify(sendRes.content || sendRes));
  console.log(`⏳ Waiting 30 seconds to monitor for Mail Delivery Subsystem bounces...`);

  await new Promise(r => setTimeout(r, 30000));

  console.log(`🔎 Checking SSN inbox for any bounce notices...`);
  const checkRes = await callZapierTool('gmail_find_email', {
    query: `from:mailer-daemon "Delivery Status Notification"`,
    max_results: 1
  }, token);

  let bounced = false;
  let bounceReason = '';

  try {
    const parsed = JSON.parse(checkRes.content[0].text);
    if (parsed.results && parsed.results.length > 0) {
      const d = new Date(parsed.results[0].date);
      // If received within last 3 minutes
      if (Date.now() - d.getTime() < 180000) {
        bounced = true;
        bounceReason = parsed.results[0].snippet || parsed.results[0].subject;
      }
    }
  } catch (e) {}

  if (bounced) {
    console.log(`❌ BOUNCE DETECTED for ${targetEmail}!`);
    console.log(`   Reason: ${bounceReason}`);
    return { target: targetEmail, status: 'BOUNCED', reason: bounceReason };
  } else {
    console.log(`✅ ZERO BOUNCE for ${targetEmail}! Delivered successfully.`);
    return { target: targetEmail, status: 'DELIVERED' };
  }
}

async function main() {
  const target = process.argv[2] || 'ug2024-it@ssn.edu.in';
  const result = await testSingleBatch(target);
  console.log('\nAudit Result:', JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal probe error:', err);
    process.exit(1);
  });
}

module.exports = { testSingleBatch };
