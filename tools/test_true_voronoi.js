const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));
const part = data.parts['Cho_T1_ㅂ'];

function distToSegmentSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx, projY = y1 + t * dy;
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

function distToPolyline(px, py, pts) {
  let minD = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSegmentSq(px, py, pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
    if (d < minD) minD = d;
  }
  return Math.sqrt(minD);
}

// Check ear point (355, 688)
const earP = [355, 688];
console.log('Distances for ear point (355, 688):');
part.medians.forEach((m, idx) => {
  console.log(`  Stroke ${idx}: ${distToPolyline(earP[0], earP[1], m).toFixed(1)} px`);
});

// Check middle bar center (275, 548)
const midP = [275, 548];
console.log('Distances for mid horizontal (275, 548):');
part.medians.forEach((m, idx) => {
  console.log(`  Stroke ${idx}: ${distToPolyline(midP[0], midP[1], m).toFixed(1)} px`);
});

// Check bottom bar center (270, 395)
const botP = [270, 395];
console.log('Distances for bottom horizontal (270, 395):');
part.medians.forEach((m, idx) => {
  console.log(`  Stroke ${idx}: ${distToPolyline(botP[0], botP[1], m).toFixed(1)} px`);
});
