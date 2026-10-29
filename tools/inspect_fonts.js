const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const regex = /fontFamily\s*=\s*['"`]([^'"`]+)['"`]|font\s*=\s*['"`]([^'"`]+)['"`]|font-family:\s*([^;'"]+)/g;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log(m[0]);
}
