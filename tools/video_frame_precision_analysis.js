const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));
const parts = Object.values(data.parts);

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

function isPointInsideStroke(px, py, polygons) {
  return polygons.some(poly => pointInPolygon(px, py, poly));
}

function getStrokeLength(stroke) {
  let len = 0;
  for (let i = 0; i < stroke.length - 1; i++) {
    len += Math.hypot(stroke[i + 1][0] - stroke[i][0], stroke[i + 1][1] - stroke[i][1]);
  }
  return len;
}

function sampleStrokeAtT(stroke, t) {
  const totalLen = getStrokeLength(stroke);
  if (totalLen < 1e-4) return stroke[0];
  const targetDist = t * totalLen;

  let accum = 0;
  for (let i = 0; i < stroke.length - 1; i++) {
    const d = Math.hypot(stroke[i + 1][0] - stroke[i][0], stroke[i + 1][1] - stroke[i][1]);
    if (accum + d >= targetDist) {
      const segT = (targetDist - accum) / (d || 1);
      return [
        stroke[i][0] + segT * (stroke[i + 1][0] - stroke[i][0]),
        stroke[i][1] + segT * (stroke[i + 1][1] - stroke[i][1])
      ];
    }
    accum += d;
  }
  return stroke[stroke.length - 1];
}

console.log('=== 동영상 프레임 정밀 분석 (Video Frame Precision Analysis) ===');
console.log(`총 분석 대상: ${parts.length}개 자소`);

const FRAMES_PER_STROKE = 30; // 30 프레임 분석
let frameOutCount = 0;
let reverseCount = 0;
const problematicParts = new Set();

parts.forEach(part => {
  const outlinePolys = parseSVGPathToPolygon(part.gungsuhOutline || (part.strokes && part.strokes[0]) || '');
  if (!outlinePolys || outlinePolys.length === 0) return;

  part.medians.forEach((stroke, sIdx) => {
    let prevPt = null;
    let prevDir = null;

    for (let f = 0; f <= FRAMES_PER_STROKE; f++) {
      const t = f / FRAMES_PER_STROKE;
      const pt = sampleStrokeAtT(stroke, t);

      // 1. 프레임 위치가 궁서체 외곽선 내부에 있는지
      const isInside = isPointInsideStroke(pt[0], pt[1], outlinePolys);
      if (!isInside) {
        // 허용 거리 (외곽선 앤티앨리어싱 경계 5px)
        let nearEdge = false;
        for (const poly of outlinePolys) {
          for (let i = 0; i < poly.length; i++) {
            const d = Math.hypot(poly[i][0] - pt[0], poly[i][1] - pt[1]);
            if (d < 5) { nearEdge = true; break; }
          }
          if (nearEdge) break;
        }
        if (!nearEdge) {
          frameOutCount++;
          problematicParts.add(`${part.id} (획 ${sIdx+1}, t=${t.toFixed(2)})`);
        }
      }

      // 2. 급격한 역주행 (반대 방향 전진) 여부
      if (prevPt) {
        const dx = pt[0] - prevPt[0];
        const dy = pt[1] - prevPt[1];
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          const curDir = [dx / dist, dy / dist];
          if (prevDir) {
            const dot = curDir[0] * prevDir[0] + curDir[1] * prevDir[1];
            if (dot < -0.85) {
              reverseCount++;
              console.log(`[Reversal] ${part.id} s${sIdx+1} frame ${f}: dot=${dot.toFixed(2)}`);
            }
          }
          prevDir = curDir;
        }
      }
      prevPt = pt;
    }
  });
});

console.log(`--------------------------------------------------`);
console.log(`프레임 정밀 분석 결과:`);
console.log(`- 역주행(Reversal) 결함: ${reverseCount} 건`);
console.log(`- 외곽선 이탈(Out-of-Outline) 결함: ${frameOutCount} 건`);
if (problematicParts.size > 0) {
  console.log(`- 이탈 발생 자소 목록 (${problematicParts.size}개):`);
  console.log(Array.from(problematicParts).slice(0, 20).join('\n'));
}
