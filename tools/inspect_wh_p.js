const fs = require('fs');
const c = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const i = c.indexOf('Cho_T2_ㅍ');
console.log(c.substring(i, i + 350));
