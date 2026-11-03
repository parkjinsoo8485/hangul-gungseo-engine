const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Target clean calibrated medians for Jong_T2_ㄹ
const targetM = [
  [[385, 303], [512, 295], [602, 295], [604, 225]],
  [[398, 208], [510, 215], [615, 222]],
  [[451, 205], [452, 155], [458, 112], [546, 108], [630, 122]]
];
const targetW = [28, 26, 28];

// 1. Update hangul_150_parts_warehouse.json
const jsonPath = path.join(__dirname, '..', 'hangul_150_parts_warehouse.json');
const rawJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

if (rawJson.parts['Jong_T2_ㄹ']) {
  rawJson.parts['Jong_T2_ㄹ'].medians = targetM;
  rawJson.parts['Jong_T2_ㄹ'].strokeWidths = targetW;
}
fs.writeFileSync(jsonPath, JSON.stringify(rawJson, null, 2), 'utf8');
console.log('Updated hangul_150_parts_warehouse.json');

// 2. Update hangul_150_parts_warehouse.js
const jsPath = path.join(__dirname, '..', 'hangul_150_parts_warehouse.js');
fs.writeFileSync(jsPath, 'window.HANGUL_150_WAREHOUSE = ' + JSON.stringify(rawJson, null, 2) + ';\n', 'utf8');
console.log('Updated hangul_150_parts_warehouse.js');

// 3. Update warehouse_centerlines.js
const clPath = path.join(__dirname, '..', 'warehouse_centerlines.js');
const clCode = fs.readFileSync(clPath, 'utf8');
const s = { window: {}, globalThis: {} };
vm.runInNewContext(clCode, s);
const clData = s.window.HANGUL_WH_CENTERLINES || s.globalThis.HANGUL_WH_CENTERLINES;

if (clData.parts['Jong_T2_ㄹ']) {
  clData.parts['Jong_T2_ㄹ'].m = targetM;
  clData.parts['Jong_T2_ㄹ'].w = targetW;
}

const dataStr = JSON.stringify(clData, null, 2);
const newClCode = `/**
 * Hangul Gungsuh 153 Parts Centerlines & Stroke Widths Database
 * Version: ${clData.version || '3.6'}
 * Updated: ${new Date().toISOString()}
 */
(function(root) {
  const data = ${dataStr};
  root.HANGUL_WH_CENTERLINES = data;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = data;
  }
})(typeof window !== 'undefined' ? window : globalThis);
`;

fs.writeFileSync(clPath, newClCode, 'utf8');
console.log('Updated warehouse_centerlines.js with universal module wrapper and fixed Jong_T2_ㄹ');
