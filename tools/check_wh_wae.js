const fs = require('fs');
let code = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const window = {};
eval(code);
const parts = window.HANGUL_WH_CENTERLINES.parts;
console.log('Jung_T1_ㅙ:', JSON.stringify(parts['Jung_T1_ㅙ'], null, 2));
console.log('Jung_T2_ㅙ:', JSON.stringify(parts['Jung_T2_ㅙ'], null, 2));
