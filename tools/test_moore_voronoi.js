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

// Ramer-Douglas-Peucker simplification
function rdpSimplify(pts, eps = 4.0) {
  if (pts.length <= 2) return pts;
  let maxD = 0, maxIdx = 0;
  const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
  const lineLen = Math.hypot(x2 - x1, y2 - y1);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const d = lineLen === 0 ? Math.hypot(x0 - x1, y0 - y1) : Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / lineLen;
    if (d > maxD) { maxD = d; maxIdx = i; }
  }
  if (maxD > eps) {
    const left = rdpSimplify(pts.slice(0, maxIdx + 1), eps);
    const right = rdpSimplify(pts.slice(maxIdx), eps);
    return left.slice(0, left.length - 1).concat(right);
  }
  return [pts[0], pts[pts.length - 1]];
}

function computeVoronoiPolygonsGrid(medians, bounds, step = 5) {
  const pad = 80;
  const b = bounds || { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
  const x0 = Math.floor((b.minX - pad) / step) * step;
  const x1 = Math.ceil((b.maxX + pad) / step) * step;
  const y0 = Math.floor((b.minY - pad) / step) * step;
  const y1 = Math.ceil((b.maxY + pad) / step) * step;

  const cols = Math.round((x1 - x0) / step) + 1;
  const rows = Math.round((y1 - y0) / step) + 1;
  const K = medians.length;

  const grid = new Int32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const py = y0 + r * step;
    for (let c = 0; c < cols; c++) {
      const px = x0 + c * step;
      let minD = Infinity;
      let bestK = 0;
      for (let k = 0; k < K; k++) {
        const d = distToPolyline(px, py, medians[k]);
        if (d < minD) {
          minD = d;
          bestK = k;
        }
      }
      grid[r * cols + c] = bestK;
    }
  }

  // Moore neighborhood boundary tracer for each stroke k
  const DIRS = [
    [1, 0], [1, 1], [0, 1], [-1, 1],
    [-1, 0], [-1, -1], [0, -1], [1, -1]
  ];

  const cells = [];
  for (let k = 0; k < K; k++) {
    // Find start pixel
    let startC = -1, startR = -1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r * cols + c] === k) {
          startC = c; startR = r;
          break;
        }
      }
      if (startC !== -1) break;
    }

    if (startC === -1) {
      cells.push([[-400, -400], [1424, -400], [1424, 1424], [-400, 1424]]);
      continue;
    }

    // Trace boundary
    const boundary = [];
    let curC = startC, curR = startR;
    let dir = 0;
    const maxSteps = cols * rows;
    let stepCount = 0;

    boundary.push([x0 + curC * step, y0 + curR * step]);

    while (stepCount++ < maxSteps) {
      let found = false;
      for (let i = 0; i < 8; i++) {
        const checkDir = (dir + 5 + i) % 8; // start checking from back-left
        const nc = curC + DIRS[checkDir][0];
        const nr = curR + DIRS[checkDir][1];
        if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && grid[nr * cols + nc] === k) {
          curC = nc;
          curR = nr;
          dir = checkDir;
          found = true;
          boundary.push([x0 + curC * step, y0 + curR * step]);
          break;
        }
      }
      if (!found || (curC === startC && curR === startR)) break;
    }

    const simplified = rdpSimplify(boundary, 4.0);
    cells.push(simplified);
  }

  return cells;
}

const t0 = Date.now();
const polys = computeVoronoiPolygonsGrid(part.medians, part.outlineBounds, 4);
console.log('Grid Voronoi computed in', Date.now() - t0, 'ms');
polys.forEach((p, idx) => {
  console.log('Stroke', idx, 'points:', p.length, 'sample:', p.slice(0, 3));
});
