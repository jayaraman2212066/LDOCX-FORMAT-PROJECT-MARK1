const { revokeToken } = require('../../auth_service');
const { getAuthTokenFromReq, clearAuthCookie } = require('../../cookie_helper');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = getAuthTokenFromReq(req);
  if (token) {
    await revokeToken(token);
  }

  clearAuthCookie(res);
  return res.status(200).json({ ok: true, message: 'Logged out successfully. Session invalidated server-side.' });
};
