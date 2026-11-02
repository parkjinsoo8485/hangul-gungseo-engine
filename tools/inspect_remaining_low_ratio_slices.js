const fs = require('fs');
const wh = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));

function parseSVGPathToPolygons(d) {
  const polys = [];
  const commands = d.match(/[a-df-z][^a-df-z]*/ig) || [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let current = [];
  for (const cmd of commands) {
    const type = cmd[0];
    const args = (cmd.slice(1).trim().match(/[-+]?(?:\d*\.\d+|\d+)/g) || []).map(Number);
    if (type === 'M') {
      if (current.length > 0) polys.push(current);
      current = [];
      cx = args[0]; cy = args[1]; sx = cx; sy = cy;
      current.push([cx, cy]);
    } else if (type === 'L') {
      for (let i = 0; i < args.length; i += 2) {
        cx = args[i]; cy = args[i+1];
        current.push([cx, cy]);
      }
    } else if (type === 'Q') {
      for (let i = 0; i < args.length; i += 4) {
        const x1 = args[i], y1 = args[i+1], x = args[i+2], y = args[i+3];
        for (let t = 0.05; t <= 1.001; t += 0.05) {
          const mt = 1 - t;
          current.push([mt*mt*cx + 2*mt*t*x1 + t*t*x, mt*mt*cy + 2*mt*t*y1 + t*t*y]);
        }
        cx = x; cy = y;
      }
    } else if (type === 'C') {
      for (let i = 0; i < args.length; i += 6) {
        const x1 = args[i], y1 = args[i+1], x2 = args[i+2], y2 = args[i+3], x = args[i+4], y = args[i+5];
        for (let t = 0.05; t <= 1.001; t += 0.05) {
          const mt = 1 - t;
          current.push([
            mt*mt*mt*cx + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x,
            mt*mt*mt*cy + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y
          ]);
        }
        cx = x; cy = y;
      }
    } else if (type === 'Z' || type === 'z') {
      cx = sx; cy = sy;
      if (current.length > 0) { polys.push(current); current = []; }
    }
  }
  if (current.length > 0) polys.push(current);
  return polys;
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function isInsideGlyph(x, y, polys) {
  let c = 0;
  for (const p of polys) if (pointInPoly(x, y, p)) c++;
  return (c % 2) === 1;
}

function getHRunsAtY(y, polys, minX = 0, maxX = 1024) {
  const runs = [];
  let inRun = false, start = 0;
  for (let x = minX; x <= maxX; x += 2) {
    const ins = isInsideGlyph(x, y, polys);
    if (ins && !inRun) { inRun = true; start = x; }
    else if (!ins && inRun) { inRun = false; runs.push([start, x - 2, Math.round((start + x - 2)/2)]); }
  }
  if (inRun) runs.push([start, maxX, Math.round((start + maxX)/2)]);
  return runs;
}

const checkKeys = [
  'Cho_T1_ㅍ', 'Cho_T3_ㅍ', 'Cho_T1_ㅅ', 'Cho_T2_ㅅ', 'Cho_T3_ㅅ',
  'Cho_T1_ㅆ', 'Cho_T2_ㅆ', 'Cho_T1_ㅈ', 'Cho_T1_ㅊ', 'Cho_T3_ㅊ',
  'Jung_T1_ㅏ', 'Jung_T1_ㅐ', 'Jung_T1_ㅑ', 'Jung_T2_ㅑ', 'Jung_T1_ㅒ',
  'Jung_T1_ㅔ', 'Jung_T1_ㅗ', 'Jung_T1_ㅛ', 'Jung_T2_ㅛ',
  'Jung_T1_ㅝ', 'Jung_T2_ㅝ', 'Jung_T1_ㅞ', 'Jung_T2_ㅞ',
  'Jong_T1_ㄼ', 'Jong_T2_ㄼ', 'Jong_T1_ㄿ', 'Jong_T2_ㄿ'
];

for (const k of checkKeys) {
  const p = wh.parts[k];
  const polys = parseSVGPathToPolygons(p.gungsuhOutline);
  let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
  for (const poly of polys) for (const [x, y] of poly) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  console.log(`\n=== ${k} === bbox=[${Math.round(minX)}..${Math.round(maxX)}, Y:${Math.round(minY)}..${Math.round(maxY)}]`);
  for (let y = Math.round(maxY - 12); y >= minY + 8; y -= Math.max(20, Math.round((maxY - minY)/8))) {
    console.log(`  Y=${y}: H-runs=${JSON.stringify(getHRunsAtY(y, polys, Math.floor(minX), Math.ceil(maxX)))}`);
  }
}
