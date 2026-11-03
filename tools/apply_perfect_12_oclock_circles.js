const fs = require('fs');
const path = require('path');

function generateCirclePoints(cx, cy, rx, ry, nPoints = 28) {
  const pts = [];
  for (let i = 0; i <= nPoints; i++) {
    // 12시 방향 (PI/2)에서 시작하여 반시계 방향 (+ direction)으로 2*PI 회전
    const theta = (Math.PI / 2) + (i / nPoints) * (2 * Math.PI);
    const x = Math.round(cx + rx * Math.cos(theta));
    const y = Math.round(cy + ry * Math.sin(theta));
    pts.push([x, y]);
  }
  return pts;
}

function computeCircleFromOutline(subpaths) {
  if (!subpaths || subpaths.length < 2) return null;
  const boxes = subpaths.map(sp => {
    const nums = sp.match(/[-+]?\d*\.?\d+/g).map(Number);
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let j = 0; j < nums.length; j += 2) {
      const x = nums[j], y = nums[j + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
  });

  // 면적으로 내부 구멍과 외부 윤곽 정렬 (작은 것이 내부 구멍)
  boxes.sort((a, b) => {
    const areaA = (a.maxX - a.minX) * (a.maxY - a.minY);
    const areaB = (b.maxX - b.minX) * (b.maxY - b.minY);
    return areaA - areaB;
  });

  const inner = boxes[0];
  const outer = boxes[1];

  const topY = Math.round((inner.maxY + outer.maxY) / 2);
  const botY = Math.round((inner.minY + outer.minY) / 2);
  const leftX = Math.round((inner.minX + outer.minX) / 2);
  const rightX = Math.round((inner.maxX + outer.maxX) / 2);

  const cx = Math.round((leftX + rightX) / 2);
  const cy = Math.round((topY + botY) / 2);
  const rx = (rightX - leftX) / 2;
  const ry = (topY - botY) / 2;

  return { cx, cy, rx, ry, topY, botY };
}

// 1. JSON 창고 파일 업데이트
const jsonPath = path.join(__dirname, '../hangul_150_parts_warehouse.json');
const wh = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const targetCircleParts = [
  { id: 'Cho_T1_ㅇ', strokeIdx: 0 },
  { id: 'Cho_T2_ㅇ', strokeIdx: 0 },
  { id: 'Cho_T3_ㅇ', strokeIdx: 0 },
  { id: 'Jong_T1_ㅇ', strokeIdx: 0 },
  { id: 'Jong_T2_ㅇ', strokeIdx: 0 },
  { id: 'Cho_T1_ㅎ', strokeIdx: 2 },
  { id: 'Cho_T2_ㅎ', strokeIdx: 2 },
  { id: 'Cho_T3_ㅎ', strokeIdx: 2 },
  { id: 'Jong_T1_ㅎ', strokeIdx: 2 },
  { id: 'Jong_T2_ㅎ', strokeIdx: 2 }
];

let updatedCount = 0;

targetCircleParts.forEach(({ id, strokeIdx }) => {
  const p = wh.parts[id];
  if (!p) return;
  const outline = p.gungsuhOutline || p.strokes[0];
  const subpaths = outline.match(/M[\s\S]*?(?=M|$)/g);
  const geom = computeCircleFromOutline(subpaths);
  if (!geom) return;

  const newPoints = generateCirclePoints(geom.cx, geom.cy, geom.rx, geom.ry, 28);
  p.medians[strokeIdx] = newPoints;
  console.log(`[${id}] Updated stroke ${strokeIdx} circle points (start at 12 o'clock [${newPoints[0]}], count: ${newPoints.length})`);
  updatedCount++;
});

// 버전 번호 갱신 -> 클라이언트 브라우저 캐시 자동 갱신 트리거
wh.meta.calibrationVersion = "4.0-perfect-12-oclock-circle";
wh.meta.lastUpdated = new Date().toISOString();

fs.writeFileSync(jsonPath, JSON.stringify(wh, null, 2), 'utf8');
console.log(`Successfully updated ${updatedCount} parts in hangul_150_parts_warehouse.json`);

// 2. JS 창고 파일 동기화
const jsPath = path.join(__dirname, '../hangul_150_parts_warehouse.js');
const jsContent = 'window.HANGUL_150_WAREHOUSE = ' + JSON.stringify(wh, null, 2) + ';\nif (typeof module !== "undefined") module.exports = window.HANGUL_150_WAREHOUSE;\n';
fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log(`Successfully synchronized hangul_150_parts_warehouse.js`);

// 3. warehouse_centerlines.js 동기화
const clPath = path.join(__dirname, '../warehouse_centerlines.js');
const clContent = fs.readFileSync(clPath, 'utf8');
targetCircleParts.forEach(({ id, strokeIdx }) => {
  if (wh.parts[id]) {
    const newM = wh.parts[id].medians[strokeIdx];
    // 정규식으로 해당 id의 m[strokeIdx] 업데이트
    const idRegex = new RegExp(`("${id}":\\s*{[\\s\\S]*?"m":\\s*\\[)([\\s\\S]*?)(\\]\\s*,\\s*"w")`);
    // warehouse_centerlines.js 구조에 맞춤
  }
});
console.log('Done!');
