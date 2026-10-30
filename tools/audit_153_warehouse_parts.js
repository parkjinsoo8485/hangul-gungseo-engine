const fs = require('fs');

const whJsonPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const localWhPath = 'c:/project/한글획순/warehouse_centerlines.js';

const whJson = JSON.parse(fs.readFileSync(whJsonPath, 'utf8'));
const localCode = fs.readFileSync(localWhPath, 'utf8');
const m = localCode.match(/window\.HANGUL_WH_CENTERLINES\s*=\s*(\{[\s\S]*\});?/);
const localWh = eval('(' + m[1] + ')');

function parseSVGPathToPolygon(pathStr) {
  if (!pathStr) return [];
  const segs = [];
  const subRe = /M\s*[\d.\-]+[\s,]+[\d.\-]+[^M]*/g;
  const rawSegs = pathStr.match(subRe) || [pathStr];
  rawSegs.forEach(seg => {
    const poly = [];
    const cmdRe = /([MLQCZmlqcz])([^MLQCZmlqcz]*)/g;
    let match;
    let cx = 0, cy = 0, startX = 0, startY = 0;
    while ((match = cmdRe.exec(seg)) !== null) {
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

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Even-odd rule across all subpaths (correctly handles holes in ㅇ, ㅎ, ㅁ, ㅂ, ㅃ, etc.!)
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

let diffFromLocal = 0;
let partsWithOutsideCtrl = 0;
let partsWithHoleCtrl = 0;
let partsWithLowDenseRatio = 0;

for (const [id, p] of Object.entries(whJson.parts)) {
  const lp = localWh.parts[id];
  if (lp && JSON.stringify(lp.m) !== JSON.stringify(p.medians)) {
    diffFromLocal++;
  }
  const outline = p.gungsuhOutline || (p.strokes && p.strokes[0]);
  const polys = parseSVGPathToPolygon(outline);

  // Check using localWh medians if available, or p.medians
  const medians = p.medians;
  let outCtrl = 0, holeCtrl = 0;
  const badStrokes = [];
  medians.forEach((st, sIdx) => {
    st.forEach(([x, y], pIdx) => {
      if (!isPointInsideAnySubpath(x, y, polys)) outCtrl++;
      else if (!isPointInsideGlyph(x, y, polys)) holeCtrl++;
    });
    // Dense sampling along polyline
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
    if (ratio < 0.85) {
      badStrokes.push({ s: sIdx + 1, ratio: +ratio.toFixed(2), pts: st });
    }
  });
  if (outCtrl > 0) partsWithOutsideCtrl++;
  if (holeCtrl > 0) partsWithHoleCtrl++;
  if (badStrokes.length > 0) {
    partsWithLowDenseRatio++;
    console.log(`[${id}] outCtrl=${outCtrl} holeCtrl=${holeCtrl} badStrokes=${JSON.stringify(badStrokes)}`);
  }
}

console.log(`\nSummary (whJson): diffFromLocal=${diffFromLocal}, partsWithOutsideCtrl=${partsWithOutsideCtrl}, partsWithHoleCtrl=${partsWithHoleCtrl}, partsWithLowDenseRatio=${partsWithLowDenseRatio}`);
