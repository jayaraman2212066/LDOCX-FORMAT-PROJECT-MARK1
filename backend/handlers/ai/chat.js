const { executeAiChatProxy } = require('../../ai_proxy');
const { verifyToken } = require('../../auth_service');
const { getAuthTokenFromReq } = require('../../cookie_helper');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = getAuthTokenFromReq(req);
  const user = token ? await verifyToken(token) : null;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const r = await executeAiChatProxy(body, user);
    return res.status(200).json(r);
  } catch (err) { return res.status(400).json({ error: err.message }); }
};
