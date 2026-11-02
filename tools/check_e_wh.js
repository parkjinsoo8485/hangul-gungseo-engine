const fs = require('fs');
let codeWH = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const window = {};
eval(codeWH);
const parts = window.HANGUL_WH_CENTERLINES.parts;
console.log('Jung_T1_ㅔ:', JSON.stringify(parts['Jung_T1_ㅔ'], null, 2));
console.log('Jung_T2_ㅔ:', JSON.stringify(parts['Jung_T2_ㅔ'], null, 2));
