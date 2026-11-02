const fs = require('fs');

const d = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));
const parts = Object.values(d.parts);

function parseSVGPathToPolygon(pathStr) {
  if (!pathStr) return [];
  const segs = [];
  const subpaths = pathStr.match(/[Mm][^Mm]*/g) || [pathStr];
  subpaths.forEach(sub => {
    const poly = [];
    let cx = 0, cy = 0;
    let startX = 0, startY = 0;
    const re = /([A-Za-z])([^A-Za-z]*)/g;
    let match;
    while ((match = re.exec(sub)) !== null) {
      const cmd = match[1];
      const args = match[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (cmd === 'M' || cmd === 'm') {
        cx = cmd === 'M' ? args[0] : cx + args[0];
        cy = cmd === 'M' ? args[1] : cy + args[1];
        startX = cx; startY = cy;
        poly.push([cx, cy]);
      } else if (cmd === 'L' || cmd === 'l') {
        for (let i = 0; i + 1 < args.length; i += 2) {
          cx = cmd === 'L' ? args[i] : cx + args[i];
          cy = cmd === 'L' ? args[i+1] : cy + args[i+1];
          poly.push([cx, cy]);
        }
      } else if (cmd === 'Q' || cmd === 'q') {
        for (let i = 0; i + 3 < args.length; i += 4) {
          const x1 = cmd === 'Q' ? args[i]   : cx + args[i];
          const y1 = cmd === 'Q' ? args[i+1] : cy + args[i+1];
          const x2 = cmd === 'Q' ? args[i+2] : cx + args[i+2];
          const y2 = cmd === 'Q' ? args[i+3] : cy + args[i+3];
          for (let t = 0.1; t <= 1.0; t += 0.1) {
            const bx = (1-t)*(1-t)*cx + 2*(1-t)*t*x1 + t*t*x2;
            const by = (1-t)*(1-t)*cy + 2*(1-t)*t*y1 + t*t*y2;
            poly.push([bx, by]);
          }
          cx = x2; cy = y2;
        }
      } else if (cmd === 'C' || cmd === 'c') {
        for (let i = 0; i + 5 < args.length; i += 6) {
          const x1 = cmd === 'C' ? args[i]   : cx + args[i];
          const y1 = cmd === 'C' ? args[i+1] : cy + args[i+1];
          const x2 = cmd === 'C' ? args[i+2] : cx + args[i+2];
          const y2 = cmd === 'C' ? args[i+3] : cy + args[i+3];
          const x3 = cmd === 'C' ? args[i+4] : cx + args[i+4];
          const y3 = cmd === 'C' ? args[i+5] : cy + args[i+5];
          for (let t = 0.1; t <= 1.0; t += 0.1) {
            const bx = Math.pow(1-t,3)*cx + 3*Math.pow(1-t,2)*t*x1 + 3*(1-t)*t*t*x2 + Math.pow(t,3)*x3;
            const by = Math.pow(1-t,3)*cy + 3*Math.pow(1-t,2)*t*y1 + 3*(1-t)*t*t*y2 + Math.pow(t,3)*y3;
            poly.push([bx, by]);
          }
          cx = x3; cy = y3;
        }
      } else if (cmd === 'Z' || cmd === 'z') {
        if (poly.length > 0) poly.push([startX, startY]);
      }
    }
    if (poly.length >= 3) segs.push(poly);
  });
  return segs;
}

function ptToSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

console.log('=== 153개 전체 자소 획 도달 거리(Reach) 및 빈 공간 전수 분석 ===');

const truncatedStrokes = [];

parts.forEach(p => {
  const polys = parseSVGPathToPolygon(p.gungsuhOutline || p.strokes[0]);
  
  // Find points on outline that are furthest from ALL medians of this part
  for (const poly of polys) {
    for (const pt of poly) {
      let minD = Infinity;
      for (const stroke of p.medians) {
        for (let i = 0; i < stroke.length - 1; i++) {
          const d = ptToSegDist(pt[0], pt[1], stroke[i][0], stroke[i][1], stroke[i+1][0], stroke[i+1][1]);
          if (d < minD) minD = d;
        }
      }
      if (minD > 105) {
        truncatedStrokes.push({
          id: p.id,
          char: p.char,
          role: p.role,
          formType: p.formType,
          dist: Math.round(minD),
          pt: [Math.round(pt[0]), Math.round(pt[1])]
        });
        break; // one entry per poly is enough to identify
      }
    }
  }
});

console.log(`중심선 도달 거리가 105px 이상 떨어져 빈 공간이 발생하는 자소: ${truncatedStrokes.length}개`);
console.log(JSON.stringify(truncatedStrokes, null, 2));
