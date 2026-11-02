const fs = require('fs');

const whJsonPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const localWhPath = 'c:/project/한글획순/warehouse_centerlines.js';

const whJson = JSON.parse(fs.readFileSync(whJsonPath, 'utf8'));
const localCode = fs.readFileSync(localWhPath, 'utf8');
const m = localCode.match(/window\.HANGUL_WH_CENTERLINES\s*=\s*(\{[\s\S]*\});?/);
const localWh = eval('(' + m[1] + ')');

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

function evalMedians(medians, polys) {
  let outCtrl = 0, totalCtrl = 0, totalSmp = 0, inSmp = 0;
  let minStrokeRatio = 1;
  medians.forEach(st => {
    st.forEach(([x, y]) => {
      totalCtrl++;
      if (!isPointInsideGlyph(x, y, polys)) outCtrl++;
    });
    let stTotal = 0, stIn = 0;
    for (let i = 0; i < st.length - 1; i++) {
      const [x1, y1] = st[i], [x2, y2] = st[i+1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.max(2, Math.ceil(len / 5));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const sx = x1 + (x2 - x1) * t;
        const sy = y1 + (y2 - y1) * t;
        stTotal++; totalSmp++;
        if (isPointInsideGlyph(sx, sy, polys)) { stIn++; inSmp++; }
      }
    }
    const r = stTotal ? stIn / stTotal : 1;
    if (r < minStrokeRatio) minStrokeRatio = r;
  });
  return { outCtrl, totalCtrl, avgRatio: +(inSmp / Math.max(1, totalSmp)).toFixed(3), minStrokeRatio: +minStrokeRatio.toFixed(3) };
}

for (const [id, p] of Object.entries(whJson.parts)) {
  const lp = localWh.parts[id];
  const outline = p.gungsuhOutline || (p.strokes && p.strokes[0]);
  const polys = parseSVGPathToPolygon(outline);
  const eJson = evalMedians(p.medians, polys);
  const eLocal = lp ? evalMedians(lp.m, polys) : null;
  if (eJson.outCtrl > 0 || eJson.minStrokeRatio < 0.90 || (eLocal && eLocal.minStrokeRatio > eJson.minStrokeRatio + 0.05)) {
    console.log(`${id.padEnd(12)} | JSON: out=${eJson.outCtrl}/${eJson.totalCtrl} minR=${eJson.minStrokeRatio} avgR=${eJson.avgRatio} | LOCAL: out=${eLocal.outCtrl}/${eLocal.totalCtrl} minR=${eLocal.minStrokeRatio} avgR=${eLocal.avgRatio}`);
  }
}
