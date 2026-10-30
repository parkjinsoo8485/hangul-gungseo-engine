const fs = require('fs');
const jsonPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const testJsonPath = 'C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.json';
const jsPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.js';
const testJsPath = 'C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.js';
const centerlinesPath = 'warehouse_centerlines.js';

const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const jsonStr = JSON.stringify(rawData, null, 2);

fs.writeFileSync(testJsonPath, jsonStr, 'utf8');
const jsContent = 'window.HANGUL_150_WAREHOUSE = ' + jsonStr + ';\n';
fs.writeFileSync(jsPath, jsContent, 'utf8');
fs.writeFileSync(testJsPath, jsContent, 'utf8');

const centerlinesData = {
  version: rawData.meta.calibrationVersion,
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
 * Version: ${rawData.meta.calibrationVersion}
 * Updated: ${centerlinesData.updatedAt}
 */
window.HANGUL_WH_CENTERLINES = ${JSON.stringify(centerlinesData, null, 2)};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.HANGUL_WH_CENTERLINES;
}
`;
fs.writeFileSync(centerlinesPath, centerlinesJs, 'utf8');

console.log('Triple storage synchronized successfully!');
