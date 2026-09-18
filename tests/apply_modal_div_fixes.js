const fs = require('fs');
const path = require('path');

const targetFiles = [
  path.resolve(__dirname, '..', '..', 'local_ldoc studio pro', 'clone_ldoc', 'viewer.html'),
  path.resolve(__dirname, '..', '..', 'local_ldoc studio pro', 'clone_ldoc', 'live-studio.html'),
  path.resolve(__dirname, '..', '..', 'local_ldoc studio pro', 'clone_ldoc', 'index.html'),
  path.resolve(__dirname, '..', 'viewer.html'),
  path.resolve(__dirname, '..', 'live-studio.html'),
  path.resolve(__dirname, '..', 'index.html'),
  path.resolve(__dirname, '..', '..', 'test', 'LDOC-Studio-Pro-Windows-VIP', 'viewer.html'),
  path.resolve(__dirname, '..', '..', 'test', 'LDOC-Studio-Pro-Windows-VIP', 'index.html')
];

for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) {
    console.log('Skipping non-existent:', filePath);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Match: <div id="lead-result-container" style="display:none"></div> followed immediately by <!-- Legal
  const searchPattern = /(<div id="lead-result-container"[^>]*><\/div>\s*\n\s*)(<!-- Legal, Intellectual Property)/g;

  if (searchPattern.test(content)) {
    content = content.replace(searchPattern, '$1    </div>\n  </div>\n</div>\n\n$2');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[FIXED] Successfully closed lead-modal divs in: ${filePath}`);
  } else {
    console.log(`[OK] Pattern already fixed or not present in: ${filePath}`);
  }
}
