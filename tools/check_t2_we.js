const fs = require('fs');
let code = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const window = {};
eval(code);
const parts = window.HANGUL_WH_CENTERLINES.parts;
console.log('Jung_T2_ㅞ:', JSON.stringify(parts['Jung_T2_ㅞ'], null, 2));
