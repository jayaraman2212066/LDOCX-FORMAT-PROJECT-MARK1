const db = require('../backend/db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const tmpls = await db.templates.listAll();
    return res.status(200).json(tmpls || []);
  } catch (err) {
    return res.status(200).json([
      {
        id: 'tmpl-gta6-launch',
        title: 'GTA VI: Welcome to Leonida',
        category: 'Game & Product Launch',
        description: 'Cinematic commercial premiere with 4K motion, 3D supercar hologram, and VIP reservation.',
        pages_count: 3,
        is_official: true
      },
      {
        id: 'tmpl-investor-pitch',
        title: 'Hyperion Quantum Propulsion',
        category: 'Investor Pitch & Tech',
        description: 'SaaS / DeepTech investor deck with live ARR trajectory chart and metrics grid.',
        pages_count: 2,
        is_official: true
      }
    ]);
  }
};
