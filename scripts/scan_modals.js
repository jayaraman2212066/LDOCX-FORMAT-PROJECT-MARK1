const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/id=["']([^"']*(?:modal|overlay|popup|dialog)[^"']*)["']/gi);
  if (matches) {
    console.log(f + ' -> ' + matches.join(', '));
  }
});
