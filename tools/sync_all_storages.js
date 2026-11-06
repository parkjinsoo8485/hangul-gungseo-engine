const fs = require('fs');

const srcPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const rawData = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const jsonStr = JSON.stringify(rawData, null, 2);
const jsContent = 'window.HANGUL_150_WAREHOUSE = ' + jsonStr + ';\n';

const allTargets = [
  // 1. auto_income
  'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json',
  'C:/project/app_clone/auto_income/hangul_150_parts_warehouse_final.json',
  // 2. auto_income/test
  'C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.json',
  'C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse_final.json',
  // 3. 한글획순
  'C:/project/한글획순/hangul_150_parts_warehouse.json',
  'C:/project/한글획순/hangul_150_parts_warehouse_final.json'
];

allTargets.forEach(tp => {
  fs.writeFileSync(tp, jsonStr, 'utf8');
  const jsPath = tp.replace(/\.json$/, '.js');
  fs.writeFileSync(jsPath, jsContent, 'utf8');
});

// Centerlines database generator for procedural vector engine
const centerlinesData = {
  version: rawData.meta.calibrationVersion || '4.0-perfect-12-oclock-circle',
  updatedAt: new Date().toISOString(),
  parts: {}
};

const partsObj = rawData.parts || rawData;
Object.keys(partsObj).forEach(id => {
  const p = partsObj[id];
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
 * Version: ${centerlinesData.version}
 * Updated: ${centerlinesData.updatedAt}
 */
window.HANGUL_WH_CENTERLINES = ${JSON.stringify(centerlinesData, null, 2)};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.HANGUL_WH_CENTERLINES;
}
`;

fs.writeFileSync('warehouse_centerlines.js', centerlinesJs, 'utf8');

console.log(`Successfully synchronized all warehouse files and warehouse_centerlines.js! (Version: ${centerlinesData.version})`);
