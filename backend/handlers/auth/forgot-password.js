const { createPasswordResetToken } = require('../../auth_service');
const { checkAuthRateLimit } = require('../../auth_rate_limiter');

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

  const email = body.email || '';

  // 1. Rate Limiting Check
  const rateCheck = checkAuthRateLimit(req, email);
  if (!rateCheck.allowed) {
    res.setHeader('Retry-After', rateCheck.retryAfterSeconds);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many password reset requests. Please try again in 15 minutes.'
    });
  }

  // 2. Generate single-use reset token
  const result = await createPasswordResetToken(email);

  // In development/test mode, provide resetToken for automated test harness verification
  const responseData = {
    ok: true,
    message: result.message
  };

  if (process.env.NODE_ENV !== 'production' && result.rawToken) {
    responseData._dev_reset_token = result.rawToken;
  }

  return res.status(200).json(responseData);
};
