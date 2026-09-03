const { handleWebhookEvent } = require('../../backend/stripe_gateway');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, stripe-signature');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const sig = req.headers['stripe-signature'];
    const result = handleWebhookEvent(payload, sig);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'Webhook processing failed: ' + err.message });
  }
};
