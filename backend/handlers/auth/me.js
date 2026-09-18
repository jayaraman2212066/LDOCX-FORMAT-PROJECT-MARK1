const { verifyToken } = require('../../auth_service');
const { getAuthTokenFromReq } = require('../../cookie_helper');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = getAuthTokenFromReq(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  return res.status(200).json({ ok: true, user });
};
