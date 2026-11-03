const fs = require('fs');

const pJson = 'hangul_150_parts_warehouse.json';
const dJson = JSON.parse(fs.readFileSync(pJson, 'utf8'));
dJson.meta.calibrationVersion = '3.9-standard-stroke-order-unified';
dJson.meta.lastUpdated = new Date().toISOString();
fs.writeFileSync(pJson, JSON.stringify(dJson, null, 2), 'utf8');

const pJs = 'hangul_150_parts_warehouse.js';
fs.writeFileSync(pJs, 'window.HANGUL_150_WAREHOUSE = ' + JSON.stringify(dJson, null, 2) + ';\n', 'utf8');

const pCl = 'warehouse_centerlines.js';
let clCode = fs.readFileSync(pCl, 'utf8');
clCode = clCode.replace(/Version:\s*[^\r\n]+/, 'Version: 3.9-standard-stroke-order-unified');
clCode = clCode.replace(/"version":\s*"[^"]+"/, '"version": "3.9-standard-stroke-order-unified"');
fs.writeFileSync(pCl, clCode, 'utf8');

console.log('Bumped calibrationVersion to 3.9-standard-stroke-order-unified across all files');
