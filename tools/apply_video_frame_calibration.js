const fs = require('fs');

const mainJsonPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const testJsonPath = 'C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.json';
const jsPath = 'c:/project/한글획순/warehouse_centerlines.js';

const mainData = JSON.parse(fs.readFileSync(mainJsonPath, 'utf8'));

// Updates:
mainData.parts['Cho_T2_ㅋ'].medians[1] = [[345, 690], [500, 696], [630, 702]];
mainData.parts['Cho_T3_ㅋ'].medians[1] = [[145, 681], [280, 689], [420, 697]];
mainData.parts['Jung_T1_ㅒ'].medians[2] = [[675, 443], [775, 445], [872, 447]];

if (!mainData.meta) mainData.meta = {};
mainData.meta.calibrationVersion = '3.8-video-frame-precision-flawless';
mainData.meta.lastUpdated = new Date().toISOString();

fs.writeFileSync(mainJsonPath, JSON.stringify(mainData, null, 2), 'utf8');
fs.writeFileSync(testJsonPath, JSON.stringify(mainData, null, 2), 'utf8');

// Sync to warehouse_centerlines.js
const jsParts = {};
for (const [id, p] of Object.entries(mainData.parts)) {
  jsParts[id] = {
    c: p.char,
    r: p.role,
    t: p.type,
    b: Array.isArray(p.box) ? p.box : [p.box.x, p.box.y, p.box.w, p.box.h],
    m: p.medians
  };
}

const jsContent = `/**
 * Hangul 153 Parts Warehouse Centerlines (Calibrated Master Dataset)
 * Version: ${mainData.meta.calibrationVersion}
 * Timestamp: ${mainData.meta.lastUpdated}
 */
const HANGUL_WH_CENTERLINES = {
  meta: ${JSON.stringify(mainData.meta, null, 2)},
  parts: ${JSON.stringify(jsParts, null, 2)}
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HANGUL_WH_CENTERLINES;
}
if (typeof window !== 'undefined') {
  window.HANGUL_WH_CENTERLINES = HANGUL_WH_CENTERLINES;
}
`;

fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log('Successfully calibrated and synced video frame precision data across all 3 files!');
