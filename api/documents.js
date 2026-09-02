// Vercel Serverless Documents Listing
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sampleDocs = [
    {
      id: 'gt6-velocity-unleashed',
      title: 'GTA VI: Welcome to Leonida (Master Living Document)',
      author: 'Rockstar Games x LDOC Studio',
      pages: 5,
      created_at: '2026-09-02T12:00:00Z',
      file: 'gt6-velocity-unleashed.ldocx'
    },
    {
      id: 'daily-prophet',
      title: 'The Daily Prophet: Living Gazette',
      author: 'Ministry of Magic',
      pages: 4,
      created_at: '2026-09-01T10:00:00Z',
      file: 'daily-prophet.ldocx'
    }
  ];

  return res.status(200).json(sampleDocs);
};
