const { resetPasswordWithToken } = require('../../auth_service');
const { checkAuthRateLimit, registerAuthFailure, registerAuthSuccess } = require('../../auth_rate_limiter');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const token = body.token || '';
  const newPassword = body.password || '';

  // 1. Rate Limiting Check
  const rateCheck = checkAuthRateLimit(req);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', rateCheck.retryAfterSeconds);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many attempts. Please try again in 15 minutes.'
    });
  }

  // 2. Perform reset
  try {
    const result = await resetPasswordWithToken(token, newPassword);
    registerAuthSuccess(req);
    return res.status(200).json(result);
  } catch (err) {
    registerAuthFailure(req);
    return res.status(400).json({ error: err.message });
  }
};
