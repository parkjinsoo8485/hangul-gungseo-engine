const fs = require('fs');
const wh = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));

let sharpTurnCount = 0;
for (const [k, p] of Object.entries(wh.parts)) {
  p.medians.forEach((m, si) => {
    for (let i = 1; i < m.length - 1; i++) {
      const dx1 = m[i][0] - m[i-1][0], dy1 = m[i][1] - m[i-1][1];
      const dx2 = m[i+1][0] - m[i][0], dy2 = m[i+1][1] - m[i][1];
      const l1 = Math.hypot(dx1, dy1), l2 = Math.hypot(dx2, dy2);
      if (l1 > 1 && l2 > 1) {
        const cos = (dx1*dx2 + dy1*dy2) / (l1*l2);
        if (cos < -0.15) {
          console.log(`SHARP TURN in ${k} #${si+1} at pt ${i} (${JSON.stringify(m[i])}): cos=${cos.toFixed(2)} m=${JSON.stringify(m)}`);
          sharpTurnCount++;
        }
      }
    }
  });
}
console.log('Total sharp turns:', sharpTurnCount);
