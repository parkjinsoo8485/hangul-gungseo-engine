const fs = require('fs');
const c = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const i = c.indexOf('Cho_T1_ㅋ');
console.log(c.substring(i, i + 350));
const i2 = c.indexOf('Cho_T2_ㅋ');
console.log(c.substring(i2, i2 + 350));
