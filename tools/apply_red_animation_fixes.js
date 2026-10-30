const fs = require('fs');
const path = require('path');

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

function buildRingMediansFromHole(polys, holePoly) {
  let cx = 0, cy = 0;
  for (const [x, y] of holePoly) { cx += x; cy += y; }
  cx /= holePoly.length;
  cy /= holePoly.length;

  const pts = [];
  const N = 16;
  for (let i = 0; i < N; i++) {
    const angle = (Math.PI / 2) + (i / N) * (Math.PI * 2);
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let rIn = null, rOut = null;
    for (let r = 2; r <= 300; r += 1) {
      const px = cx + r * dx, py = cy + r * dy;
      const ins = isInsideGlyph(px, py, polys);
      if (rIn === null && ins) rIn = r;
      else if (rIn !== null && rOut === null && !ins) { rOut = r; break; }
    }
    if (rIn !== null && rOut !== null) {
      const rMid = 0.5 * (rIn + rOut);
      pts.push([Math.round(cx + rMid * dx), Math.round(cy + rMid * dy)]);
    }
  }
  if (pts.length > 0) pts.push([...pts[0]]);
  return pts;
}

const targetFiles = [
  'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json',
  'C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.json'
];

for (const f of targetFiles) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));

  // 1. All 14 ring parts
  const ringParts = [
    ['Cho_T1_ㅇ', 0], ['Cho_T2_ㅇ', 0], ['Cho_T3_ㅇ', 0],
    ['Cho_T1_ㅎ', 2], ['Cho_T2_ㅎ', 2], ['Cho_T3_ㅎ', 2],
    ['Jong_T1_ㅇ', 0], ['Jong_T2_ㅇ', 0],
    ['Jong_T1_ㅎ', 2], ['Jong_T2_ㅎ', 2],
    ['Jong_T1_ㄶ', 3], ['Jong_T2_ㄶ', 3],
    ['Jong_T1_ㅀ', 5], ['Jong_T2_ㅀ', 5]
  ];
  for (const [k, sIdx] of ringParts) {
    const p = d.parts[k];
    const polys = parseSVGPathToPolygons(p.gungsuhOutline);
    let holePoly = null;
    for (let i = 0; i < polys.length; i++) {
      let cx = 0, cy = 0;
      for (const [x, y] of polys[i]) { cx += x; cy += y; }
      cx /= polys[i].length; cy /= polys[i].length;
      let parentCount = 0;
      for (let j = 0; j < polys.length; j++) {
        if (i !== j && pointInPoly(cx, cy, polys[j])) parentCount++;
      }
      if (parentCount % 2 === 1) { holePoly = polys[i]; break; }
    }
    if (holePoly) {
      p.medians[sIdx] = buildRingMediansFromHole(polys, holePoly);
    }
  }

  // 2. Cho_T2_ㅍ
  d.parts['Cho_T2_ㅍ'].medians = [
    [[337,835],[539,825],[683,839]],
    [[425,778],[435,700],[441,630]],
    [[617,778],[625,700],[630,620]],
    [[306,601],[551,573],[735,595]]
  ];
  d.parts['Cho_T2_ㅍ'].strokes = [
    d.parts['Cho_T2_ㅍ'].gungsuhOutline,
    d.parts['Cho_T2_ㅍ'].gungsuhOutline,
    d.parts['Cho_T2_ㅍ'].gungsuhOutline,
    d.parts['Cho_T2_ㅍ'].gungsuhOutline
  ];

  // 3. Jong_T1_ㅍ
  d.parts['Jong_T1_ㅍ'].medians = [
    [[335,385],[537,375],[681,389]],
    [[425,328],[435,255],[441,180]],
    [[617,328],[625,255],[630,175]],
    [[304,151],[510,164],[716,142]]
  ];
  d.parts['Jong_T1_ㅍ'].strokes = [
    d.parts['Jong_T1_ㅍ'].gungsuhOutline,
    d.parts['Jong_T1_ㅍ'].gungsuhOutline,
    d.parts['Jong_T1_ㅍ'].gungsuhOutline,
    d.parts['Jong_T1_ㅍ'].gungsuhOutline
  ];

  // 4. Jung_T1_ㅖ
  d.parts['Jung_T1_ㅖ'].medians = [
    [[580,603],[678,595],[740,597]],
    [[571,467],[686,456],[740,475]],
    [[735,745],[737,600],[737,470],[735,330],[721,270]],
    [[856,818],[858,512],[888,371],[872,227]]
  ];
  if (d.parts['Jung_T1_ㅖ'].strokes && d.parts['Jung_T1_ㅖ'].strokes.length >= 4) {
    const subYe = d.parts['Jung_T1_ㅖ'].gungsuhOutline.match(/M[\s\S]*?(?=M|$)/g).map(s => s.trim());
    if (subYe.length >= 2) {
      d.parts['Jung_T1_ㅖ'].strokes[0] = subYe[1];
      d.parts['Jung_T1_ㅖ'].strokes[1] = subYe[1];
      d.parts['Jung_T1_ㅖ'].strokes[2] = subYe[1];
      d.parts['Jung_T1_ㅖ'].strokes[3] = subYe[0];
    }
  }

  // 5. Jong_T1_ㄷ
  d.parts['Jong_T1_ㄷ'].medians = [
    [[301,361],[501,358],[672,394]],
    [[395,330],[398,245],[396,185],[435,135],[530,139],[719,154]]
  ];

  // 6. Jong_T2_ㄷ
  d.parts['Jong_T2_ㄷ'].medians = [
    [[338,289],[506,287],[645,316]],
    [[432,250],[432,215],[435,145],[474,109],[526,118],[668,128]]
  ];

  // 7. Cho_T1_ㄹ
  d.parts['Cho_T1_ㄹ'].medians = [
    [[102,653],[285,645],[405,642],[403,575]],
    [[111,523],[274,524],[437,544]],
    [[180,485],[197,447],[208,381],[327,383],[465,413]]
  ];

  if (!d.meta) d.meta = {};
  d.meta.updatedAt = new Date().toISOString();
  d.meta.calibrationVersion = '3.6-perfect-red-animation-calibrated';

  fs.writeFileSync(f, JSON.stringify(d, null, 2), 'utf8');

  // Also write JS file
  const jsPath = f.replace('.json', '.js');
  const jsContent = '/**\n * hangul_150_parts_warehouse.js\n */\n(function (global) {\n  global.HANGUL_150_WAREHOUSE = ' + JSON.stringify(d) + ';\n})(typeof window !== "undefined" ? window : global);\n';
  fs.writeFileSync(jsPath, jsContent, 'utf8');
}

console.log('Successfully updated warehouse JSON and JS across all locations.');
