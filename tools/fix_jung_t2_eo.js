const fs = require('fs');

const wh = JSON.parse(fs.readFileSync('hangul_150_parts_warehouse.json', 'utf8'));
if (wh.parts['Jung_T2_ㅓ'] && wh.parts['Jung_T2_ㅓ'].strokes.length === 1) {
  wh.parts['Jung_T2_ㅓ'].strokes.push(wh.parts['Jung_T2_ㅓ'].strokes[0]);
  fs.writeFileSync('hangul_150_parts_warehouse.json', JSON.stringify(wh, null, 2), 'utf8');
  console.log('Fixed Jung_T2_ㅓ in hangul_150_parts_warehouse.json');
}

const jsContent = 'window.HANGUL_150_WAREHOUSE = ' + JSON.stringify(wh, null, 2) + ';\nif (typeof module !== "undefined") module.exports = window.HANGUL_150_WAREHOUSE;\n';
fs.writeFileSync('hangul_150_parts_warehouse.js', jsContent, 'utf8');
console.log('Synchronized hangul_150_parts_warehouse.js');
