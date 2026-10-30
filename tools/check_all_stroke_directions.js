const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));
const parts = data.parts;

const circleIds = [
  'Cho_T1_ㅇ', 'Cho_T2_ㅇ', 'Cho_T3_ㅇ',
  'Cho_T1_ㅎ', 'Cho_T2_ㅎ', 'Cho_T3_ㅎ',
  'Jong_T1_ㅇ', 'Jong_T2_ㅇ',
  'Jong_T1_ㅎ', 'Jong_T2_ㅎ',
  'Jong_T1_ㄶ', 'Jong_T2_ㄶ',
  'Jong_T1_ㅀ', 'Jong_T2_ㅀ'
];

const issues = [];

Object.keys(parts).forEach(id => {
  const p = parts[id];
  p.medians.forEach((st, sIdx) => {
    const isCircle = circleIds.includes(id) && sIdx === p.medians.length - 1;
    if (isCircle) return;

    const p0 = st[0];
    const pN = st[st.length - 1];
    const dx = pN[0] - p0[0];
    const dy = pN[1] - p0[1];

    // Vertical stroke: abs(dy) > abs(dx)
    // In HanziWriter coords (Y goes UP), top-to-bottom means dy < 0!
    // If dy > 40, it goes upwards (bottom-to-top)
    if (dy > 40 && dy > Math.abs(dx) * 1.2) {
      issues.push({ id, sIdx, p0, pN, reason: 'Vertical stroke goes upwards (bottom-to-top)' });
    }

    // Horizontal stroke: abs(dx) > abs(dy)
    // Left-to-right means dx > 0!
    // If dx < -40, it goes right-to-left
    if (dx < -40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      // Check if it's a right-falling slant like the second stroke of ㅅ or ㅈ:
      // In ㅅ / ㅈ: 1st stroke is left-falling (top to bottom-left: dx < 0, dy < 0)
      // 2nd stroke is right-falling (top to bottom-right: dx > 0, dy < 0)
      // If a horizontal bar goes right-to-left, that's an inversion!
      if (Math.abs(dy) < 60) {
        issues.push({ id, sIdx, p0, pN, reason: 'Horizontal bar goes right-to-left' });
      }
    }
  });
});

console.log('Total stroke direction issues found:', issues.length);
issues.forEach(iss => console.log(`  [${iss.id}] Stroke ${iss.sIdx}: ${iss.reason} (p0=[${iss.p0}], pN=[${iss.pN}])`));
