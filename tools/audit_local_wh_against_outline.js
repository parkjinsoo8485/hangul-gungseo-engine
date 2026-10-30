const fs = require('fs');

const whJsonPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const localWhPath = 'c:/project/한글획순/warehouse_centerlines.js';

const whJson = JSON.parse(fs.readFileSync(whJsonPath, 'utf8'));
const localCode = fs.readFileSync(localWhPath, 'utf8');
const m = localCode.match(/window\.HANGUL_WH_CENTERLINES\s*=\s*(\{[\s\S]*\});?/);
const localWh = eval('(' + m[1] + ')');

// Reuse polygon functions
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
function isPointInsideAnySubpath(px, py, polygons) {
  return polygons.some(poly => pointInPolygon(px, py, poly));
}

let partsWithOutsideCtrl = 0;
let partsWithHoleCtrl = 0;
let partsWithLowDenseRatio = 0;

for (const [id, p] of Object.entries(whJson.parts)) {
  const lp = localWh.parts[id];
  const outline = p.gungsuhOutline || (p.strokes && p.strokes[0]);
  const polys = parseSVGPathToPolygon(outline);

  const medians = lp ? lp.m : p.medians;
  let outCtrl = 0, holeCtrl = 0;
  const badStrokes = [];
  medians.forEach((st, sIdx) => {
    st.forEach(([x, y], pIdx) => {
      if (!isPointInsideAnySubpath(x, y, polys)) outCtrl++;
      else if (!isPointInsideGlyph(x, y, polys)) holeCtrl++;
    });
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
    const ratio = totalSmp ? inSmp / totalSmp : 1;
    if (ratio < 0.85 || outCtrl > 0 || holeCtrl > 0) {
      // check if this specific stroke had outCtrl or low ratio
      const stOut = st.filter(([x, y]) => !isPointInsideGlyph(x, y, polys));
      if (ratio < 0.85 || stOut.length > 0) {
        badStrokes.push({ s: sIdx + 1, ratio: +ratio.toFixed(2), stOut, pts: st });
      }
    }
  });
  if (outCtrl > 0) partsWithOutsideCtrl++;
  if (holeCtrl > 0) partsWithHoleCtrl++;
  if (badStrokes.length > 0) {
    partsWithLowDenseRatio++;
    console.log(`[${id}] outCtrl=${outCtrl} holeCtrl=${holeCtrl} badStrokes=${JSON.stringify(badStrokes)}`);
  }
}

console.log(`\nSummary (localWh): partsWithOutsideCtrl=${partsWithOutsideCtrl}, partsWithHoleCtrl=${partsWithHoleCtrl}, partsWithLowDenseRatio=${partsWithLowDenseRatio}`);
