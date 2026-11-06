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
  version: rawData.meta.calibrationVersion || '4.1-user-curated-lock',
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
(function (global) {
  'use strict';
  global.HANGUL_WH_CENTERLINES = ${JSON.stringify(centerlinesData, null, 2)};
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.HANGUL_WH_CENTERLINES;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
`;

fs.writeFileSync('warehouse_centerlines.js', centerlinesJs, 'utf8');

// 백업 파일 생성 (사용자의 소중한 수정 데이터 영구 보존)
const backupDir = 'C:/project/한글획순/backups';
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
const backupPath = `${backupDir}/hangul_150_parts_warehouse_${Date.now()}.json`;
fs.writeFileSync(backupPath, jsonStr, 'utf8');
fs.writeFileSync(`${backupDir}/hangul_150_parts_warehouse_latest_backup.json`, jsonStr, 'utf8');

console.log(`Successfully synchronized all warehouse files and warehouse_centerlines.js! (Version: ${centerlinesData.version})`);
console.log(`Backup saved to ${backupPath}`);
