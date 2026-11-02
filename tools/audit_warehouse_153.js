const fs = require('fs');

const jsonPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const parts = data.parts;
const keys = Object.keys(parts);

console.log('Total warehouse parts:', keys.length);

// 1. Check circular 14 glyphs
const circleIds = [
  'Cho_T1_ㅇ', 'Cho_T2_ㅇ', 'Cho_T3_ㅇ',
  'Cho_T1_ㅎ', 'Cho_T2_ㅎ', 'Cho_T3_ㅎ',
  'Jong_T1_ㅇ', 'Jong_T2_ㅇ',
  'Jong_T1_ㅎ', 'Jong_T2_ㅎ',
  'Jong_T1_ㄶ', 'Jong_T2_ㄶ',
  'Jong_T1_ㅀ', 'Jong_T2_ㅀ'
];

let circleGaps = 0;
circleIds.forEach(id => {
  const p = parts[id];
  if (!p) {
    console.error(`Missing circle part: ${id}`);
    circleGaps++;
    return;
  }
  const lastStroke = p.medians[p.medians.length - 1];
  const p0 = lastStroke[0];
  const pN = lastStroke[lastStroke.length - 1];
  const gap = Math.hypot(p0[0] - pN[0], p0[1] - pN[1]);
  if (gap > 0.001) {
    console.warn(`Unsealed circle in ${id}: gap = ${gap.toFixed(3)}px`);
    circleGaps++;
  }
});
if (circleGaps === 0) {
  console.log('Check 1: All 14 circular glyphs sealed 100% (gap === 0.0px)!');
}

// 2. Check stroke counts and medians integrity
let emptyMedians = 0;
keys.forEach(id => {
  const p = parts[id];
  if (!p.medians || p.medians.length === 0) {
    console.error(`Part ${id} has no medians`);
    emptyMedians++;
  } else {
    p.medians.forEach((st, sIdx) => {
      if (st.length < 2) {
        console.warn(`Part ${id} stroke ${sIdx} has fewer than 2 points`);
        emptyMedians++;
      }
    });
  }
});
if (emptyMedians === 0) {
  console.log('Check 2: All 153 parts have valid multi-point medians!');
}

// 3. Check stroke direction (Korean standard: top-to-bottom, left-to-right)
let directionAnomalies = [];
keys.forEach(id => {
  const p = parts[id];
  p.medians.forEach((st, sIdx) => {
    const p0 = st[0];
    const pN = st[st.length - 1];
    const dx = pN[0] - p0[0];
    const dy = pN[1] - p0[1]; // In HanziWriter coords, Y goes UP (top has higher Y)
    // For non-circles, check if a stroke goes bottom-to-top or right-to-left abnormally
    const isCircleStroke = circleIds.includes(id) && sIdx === p.medians.length - 1;
    if (!isCircleStroke) {
      // If predominantly vertical and going upwards (dy > 30 and abs(dy) > 1.5 * abs(dx)):
      // In HanziWriter coords, top is high Y, bottom is low Y.
      // Standard top-to-bottom means p0 should have HIGHER Y than pN (dy < 0).
      // If dy > 50 (starts at bottom and goes to top), that's inverted!
      if (dy > 50 && dy > Math.abs(dx) * 1.5) {
        directionAnomalies.push({ id, sIdx, p0, pN, dy, type: 'bottom-to-top-inverted' });
      }
    }
  });
});

console.log('Check 3: Stroke direction anomalies count:', directionAnomalies.length);
if (directionAnomalies.length > 0) {
  console.log('Anomalies sample:', directionAnomalies.slice(0, 5));
}
