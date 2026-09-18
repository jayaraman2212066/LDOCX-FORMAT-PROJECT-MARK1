const fs = require('fs');
for (const file of ['live-studio.html', 'viewer.html', 'creator.html', 'index.html']) {
  const p = 'D:/LDOCX/local_ldoc studio pro/clone_ldoc/' + file;
  const content = fs.readFileSync(p, 'utf8');
  const openCount = (content.match(/<div\b/gi) || []).length;
  const closeCount = (content.match(/<\/div>/gi) || []).length;
  console.log(`${file} Div Balance: Open = ${openCount}, Close = ${closeCount}, Diff = ${openCount - closeCount}`);
}
