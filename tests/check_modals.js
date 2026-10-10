const fs = require('fs');
const files = ['index.html', 'features.html', 'format.html', 'live-studio.html', 'models.html', 'pricing.html', 'docs.html', 'changelog.html', 'creator.html', 'security.html'];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const c = fs.readFileSync(f, 'utf8');
  // Check modal overlays
  const matches = c.match(/<div[^>]*class="[^"]*(?:modal|overlay)[^"]*"[^>]*>/gi) || [];
  console.log(`${f}: found ${matches.length} modal/overlay div elements:`);
  matches.forEach(m => {
    const idMatch = m.match(/id="([^"]+)"/);
    const classMatch = m.match(/class="([^"]+)"/);
    const styleMatch = m.match(/style="([^"]+)"/);
    console.log(`  - id: ${idMatch ? idMatch[1] : 'none'}, class: ${classMatch ? classMatch[1] : 'none'}, style: ${styleMatch ? styleMatch[1] : 'none'}`);
  });
}
