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

function computeExactVoronoiPolygons(medians, bounds, step = 5) {
  const pad = 60;
  const x0 = Math.floor((bounds.minX - pad) / step) * step;
  const x1 = Math.ceil((bounds.maxX + pad) / step) * step;
  const y0 = Math.floor((bounds.minY - pad) / step) * step;
  const y1 = Math.ceil((bounds.maxY + pad) / step) * step;

  const cols = Math.round((x1 - x0) / step) + 1;
  const rows = Math.round((y1 - y0) / step) + 1;
  const K = medians.length;

  // Grid assignment
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

  // Extract boundary polygon for each stroke k using marching horizontal/vertical segments
  const cells = [];
  for (let k = 0; k < K; k++) {
    // Collect all cells belonging to stroke k as rectangles or boundary
    // A robust way to represent the cell for SVG clipPath:
    // We can generate path rects or trace contour.
    // Even simpler: for each row r, find spans of c where grid == k
    const rects = [];
    for (let r = 0; r < rows - 1; r++) {
      const py = y0 + r * step;
      let inSpan = false;
      let startC = 0;
      for (let c = 0; c < cols; c++) {
        const isK = grid[r * cols + c] === k;
        if (isK && !inSpan) {
          inSpan = true;
          startC = c;
        } else if (!isK && inSpan) {
          inSpan = false;
          rects.push(`M ${x0 + startC * step} ${py} H ${x0 + c * step} V ${py + step} H ${x0 + startC * step} Z`);
        }
      }
      if (inSpan) {
        rects.push(`M ${x0 + startC * step} ${py} H ${x0 + cols * step} V ${py + step} H ${x0 + startC * step} Z`);
      }
    }
    cells.push(rects.join(' '));
  }

  return cells;
}

const t0 = Date.now();
const voronoiPaths = computeExactVoronoiPolygons(part.medians, part.outlineBounds, 4);
console.log('Computed in', Date.now() - t0, 'ms');
voronoiPaths.forEach((p, idx) => console.log('Stroke', idx, 'clip path rect count:', p.split('M ').length - 1));
