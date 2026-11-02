const fs = require('fs');

const jsonPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const testJsonPath = 'C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.json';
const jsPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.js';
const testJsPath = 'C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.js';
const centerlinesPath = 'warehouse_centerlines.js';

const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

rawData.parts['Cho_T2_ㅋ'].medians = [
  [[335, 844], [515, 831], [642, 822], [638, 705], [628, 573]],
  [[330, 707], [515, 711], [645, 725]]
];

rawData.parts['Jung_T1_ㅒ'].medians = [
  [[612, 780], [672, 690], [675, 540], [675, 400], [662, 265]],
  [[675, 628], [775, 632], [872, 628]],
  [[675, 412], [775, 416], [872, 412]],
  [[805, 865], [880, 775], [880, 510], [878, 300], [862, 165]]
];

const newVersion = '3.7-zero-bleeding-flawless-calibrated';
rawData.meta.calibrationVersion = newVersion;
rawData.meta.lastCalibratedAt = new Date().toISOString();

const jsonStr = JSON.stringify(rawData, null, 2);
fs.writeFileSync(jsonPath, jsonStr, 'utf8');
if (fs.existsSync(testJsonPath)) fs.writeFileSync(testJsonPath, jsonStr, 'utf8');

const jsContent = `window.HANGUL_150_WAREHOUSE = ${jsonStr};\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');
if (fs.existsSync(testJsPath)) fs.writeFileSync(testJsPath, jsContent, 'utf8');

const centerlinesData = {
  version: newVersion,
  updatedAt: new Date().toISOString(),
  parts: {}
};

Object.keys(rawData.parts).forEach(id => {
  const p = rawData.parts[id];
  const boxArr = p.box ? [p.box.x, p.box.y, p.box.w, p.box.h] : [0, 0, 1024, 1024];
  centerlinesData.parts[id] = {
    c: p.char,
    r: p.role,
    t: p.formType || p.typeIdx || 1,
    b: boxArr,
    m: p.medians,
    w: p.strokeWidths || (p.strokeWidth ? [p.strokeWidth] : [34])
  };
});

const centerlinesJs = `/**
 * Hangul Gungsuh 153 Parts Centerlines & Stroke Widths Database
 * Version: ${newVersion}
 * Updated: ${centerlinesData.updatedAt}
 */
window.HANGUL_WH_CENTERLINES = ${JSON.stringify(centerlinesData)};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.HANGUL_WH_CENTERLINES;
}
`;
fs.writeFileSync(centerlinesPath, centerlinesJs, 'utf8');

console.log('Restored verified coordinates for Cho_T2_ㅋ and Jung_T1_ㅒ!');
