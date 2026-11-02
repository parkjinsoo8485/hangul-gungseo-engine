const fs = require('fs');

const whJsonPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const whJson = JSON.parse(fs.readFileSync(whJsonPath, 'utf8'));

const auditCode = fs.readFileSync('c:/project/한글획순/tools/audit_153_warehouse_parts.js', 'utf8');
const parseSVGPathToPolygon = eval('(' + auditCode.match(/function parseSVGPathToPolygon[\s\S]*?return segs;\n\}/)[0] + ')');
const pointInPolygon = eval('(' + auditCode.match(/function pointInPolygon[\s\S]*?return inside;\n\}/)[0] + ')');
function isPointInsideGlyph(px, py, polygons) {
  let count = 0;
  for (const poly of polygons) {
    if (pointInPolygon(px, py, poly)) count++;
  }
  return (count % 2) === 1;
}

function evalPart(id, p) {
  const outline = p.gungsuhOutline || (p.strokes && p.strokes[0]);
  const polys = parseSVGPathToPolygon(outline);
  const allPts = polys.flat();
  const xs = allPts.map(q => q[0]), ys = allPts.map(q => q[1]);
  const minX = Math.round(Math.min(...xs)), maxX = Math.round(Math.max(...xs));
  const minY = Math.round(Math.min(...ys)), maxY = Math.round(Math.max(...ys));

  const strokeStats = p.medians.map((st, sIdx) => {
    const outPts = st.filter(([x, y]) => !isPointInsideGlyph(x, y, polys));
    let totalSmp = 0, inSmp = 0;
    for (let i = 0; i < st.length - 1; i++) {
      const [x1, y1] = st[i], [x2, y2] = st[i+1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.max(2, Math.ceil(len / 5));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const sx = x1 + (x2 - x1) * t;
        const sy = y1 + (y2 - y1) * t;
        totalSmp++;
        if (isPointInsideGlyph(sx, sy, polys)) inSmp++;
      }
    }
    return {
      s: sIdx + 1,
      ratio: +(inSmp / Math.max(1, totalSmp)).toFixed(2),
      outPts,
      pts: st
    };
  });
  return { id, outlineBox: [minX, minY, maxX - minX, maxY - minY], declaredBox: [p.box.x, p.box.y, p.box.w, p.box.h], polys, strokeStats };
}

for (const [id, p] of Object.entries(whJson.parts)) {
  const res = evalPart(id, p);
  const bad = res.strokeStats.filter(s => s.ratio < 0.90 || s.outPts.length > 0);
  if (bad.length > 0) {
    console.log(`\n=== ${id} === outlineBBox=[${res.outlineBox[0]}..${res.outlineBox[0]+res.outlineBox[2]}, Y:${res.outlineBox[1]}..${res.outlineBox[1]+res.outlineBox[3]}] box=${JSON.stringify(res.declaredBox)}`);
    res.strokeStats.forEach(s => {
      console.log(`  #${s.s}: ratio=${s.ratio} outPts=${JSON.stringify(s.outPts)} pts=${JSON.stringify(s.pts)}`);
    });
  }
}
