const fs = require('fs');

const jsonPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const testJsonPath = 'C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.json';
const jsPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.js';
const testJsPath = 'C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.js';
const centerlinesPath = 'warehouse_centerlines.js';

const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const parts = rawData.parts;

// T자/L자 교차점 분리 함수
function separateJunctionMedians(medians, safetyMargin = 14) {
  if (!medians || medians.length <= 1) return { medians, modifiedCount: 0 };
  const newMedians = JSON.parse(JSON.stringify(medians));
  let modifiedCount = 0;

  for (let i = 0; i < newMedians.length; i++) {
    for (let j = 0; j < newMedians.length; j++) {
      if (i === j) continue;
      const mA = newMedians[i];
      const mB = newMedians[j];
      if (mA.length < 2 || mB.length < 2) continue;

      // 획 j의 시작점이 획 i의 선분 몸통과 매우 가깝거나 교차
      const startB = mB[0];
      for (let s = 0; s < mA.length - 1; s++) {
        const p1 = mA[s];
        const p2 = mA[s + 1];
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const l2 = dx * dx + dy * dy;
        if (l2 < 1e-4) continue;

        let t = ((startB[0] - p1[0]) * dx + (startB[1] - p1[1]) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = p1[0] + t * dx;
        const projY = p1[1] + t * dy;
        const dist = Math.hypot(startB[0] - projX, startB[1] - projY);

        if (dist < safetyMargin) {
          const dirX = mB[1][0] - startB[0];
          const dirY = mB[1][1] - startB[1];
          const dirLen = Math.hypot(dirX, dirY);
          if (dirLen > 1e-4) {
            const shift = (safetyMargin - dist) + 2;
            mB[0][0] = Math.round(startB[0] + (dirX / dirLen) * shift);
            mB[0][1] = Math.round(startB[1] + (dirY / dirLen) * shift);
            modifiedCount++;
          }
        }
      }

      // 획 j의 끝점이 획 i의 선분 몸통과 매우 가깝거나 교차
      const endB = mB[mB.length - 1];
      const prevB = mB[mB.length - 2];
      for (let s = 0; s < mA.length - 1; s++) {
        const p1 = mA[s];
        const p2 = mA[s + 1];
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const l2 = dx * dx + dy * dy;
        if (l2 < 1e-4) continue;

        let t = ((endB[0] - p1[0]) * dx + (endB[1] - p1[1]) * dy) / l2;
        t = Math.max(0, Math.min(1, t));
        const projX = p1[0] + t * dx;
        const projY = p1[1] + t * dy;
        const dist = Math.hypot(endB[0] - projX, endB[1] - projY);

        if (dist < safetyMargin) {
          const dirX = endB[0] - prevB[0];
          const dirY = endB[1] - prevB[1];
          const dirLen = Math.hypot(dirX, dirY);
          if (dirLen > 1e-4) {
            const shift = (safetyMargin - dist) + 2;
            endB[0] = Math.round(endB[0] - (dirX / dirLen) * shift);
            endB[1] = Math.round(endB[1] - (dirY / dirLen) * shift);
            modifiedCount++;
          }
        }
      }
    }
  }

  return { medians: newMedians, modifiedCount };
}

// 획별 최적 안전 두께 계산
function computeSafeStrokeWidths(medians, isDoubleJongsung = false) {
  if (!medians || medians.length === 0) return [34];
  if (medians.length === 1) return [34];

  return medians.map((m, sIdx) => {
    let minDist = Infinity;
    medians.forEach((otherM, oIdx) => {
      if (oIdx === sIdx) return;
      m.forEach(pA => {
        otherM.forEach(pB => {
          const d = Math.hypot(pA[0] - pB[0], pA[1] - pB[1]);
          if (d < minDist) minDist = d;
        });
      });
    });

    let safeW;
    if (isDoubleJongsung) {
      safeW = Math.max(18, Math.min(26, Math.round(minDist * 0.65)));
    } else {
      safeW = Math.max(22, Math.min(36, Math.round(minDist * 0.72)));
    }
    return safeW;
  });
}

let totalJunctionMod = 0;
let totalWidthMod = 0;

Object.keys(parts).forEach(id => {
  const p = parts[id];
  if (!p.medians || p.medians.length <= 1) return;

  const isDouble = p.role === 'jong' && (p.char.length > 1 || ['ㄳ','ㄵ','ㄶ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅄ','ㅆ'].includes(p.char));
  
  // 접합부 안전 분리
  const sep = separateJunctionMedians(p.medians, 14);
  if (sep.modifiedCount > 0) {
    p.medians = sep.medians;
    totalJunctionMod++;
  }

  // 안전 두께 계산
  const safeW = computeSafeStrokeWidths(p.medians, isDouble);
  p.strokeWidths = safeW;
  p.strokeWidth = safeW[0];
  totalWidthMod++;
});

console.log(`Separated junctions for ${totalJunctionMod} parts.`);
console.log(`Updated safe stroke widths for ${totalWidthMod} parts.`);

// 버전 갱신
const newVersion = '3.7-zero-bleeding-flawless-calibrated';
rawData.meta.calibrationVersion = newVersion;
rawData.meta.lastCalibratedAt = new Date().toISOString();

// 저장
const jsonStr = JSON.stringify(rawData, null, 2);
fs.writeFileSync(jsonPath, jsonStr, 'utf8');
if (fs.existsSync(testJsonPath)) fs.writeFileSync(testJsonPath, jsonStr, 'utf8');

const jsContent = `window.HANGUL_150_WAREHOUSE = ${jsonStr};\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');
if (fs.existsSync(testJsPath)) fs.writeFileSync(testJsPath, jsContent, 'utf8');

// warehouse_centerlines.js 동기화
const centerlinesData = {
  version: newVersion,
  updatedAt: new Date().toISOString(),
  parts: {}
};

Object.keys(parts).forEach(id => {
  const p = parts[id];
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

console.log('Synchronized hangul_150_parts_warehouse.json, .js, and warehouse_centerlines.js successfully!');
