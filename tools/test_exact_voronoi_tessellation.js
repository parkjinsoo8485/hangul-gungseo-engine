const fs = require('fs');

function ptToSegmentDistSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-6) return { distSq: (px - x1)**2 + (py - y1)**2, proj: [x1, y1] };
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return { distSq: (px - projX)**2 + (py - projY)**2, proj: [projX, projY] };
}

function closestPointOnStroke(px, py, stroke) {
  let minDistSq = Infinity;
  let bestProj = stroke[0];
  for (let i = 0; i < stroke.length - 1; i++) {
    const res = ptToSegmentDistSq(px, py, stroke[i][0], stroke[i][1], stroke[i + 1][0], stroke[i + 1][1]);
    if (res.distSq < minDistSq) {
      minDistSq = res.distSq;
      bestProj = res.proj;
    }
  }
  return { dist: Math.sqrt(minDistSq), pt: bestProj };
}

function findClosestPairBetweenStrokes(strokeA, strokeB) {
  let minDist = Infinity;
  let bestA = strokeA[0], bestB = strokeB[0];
  for (let i = 0; i < strokeA.length; i++) {
    const pA = strokeA[i];
    const { dist, pt } = closestPointOnStroke(pA[0], pA[1], strokeB);
    if (dist < minDist) {
      minDist = dist;
      bestA = pA;
      bestB = pt;
    }
  }
  for (let j = 0; j < strokeB.length; j++) {
    const pB = strokeB[j];
    const { dist, pt } = closestPointOnStroke(pB[0], pB[1], strokeA);
    if (dist < minDist) {
      minDist = dist;
      bestA = pt;
      bestB = pB;
    }
  }
  return { dist: minDist, pA: bestA, pB: bestB };
}

function clipPolygonByHalfPlane(poly, mx, my, nx, ny) {
  if (!poly || poly.length === 0) return [];
  const len = Math.hypot(nx, ny);
  if (len < 1e-4) return poly;
  const unx = nx / len;
  const uny = ny / len;

  function isInside(pt) {
    return unx * (pt[0] - mx) + uny * (pt[1] - my) >= -0.01;
  }

  function lineIntersect(p1, p2) {
    const d1 = unx * (p1[0] - mx) + uny * (p1[1] - my);
    const d2 = unx * (p2[0] - mx) + uny * (p2[1] - my);
    const diff = d1 - d2;
    if (Math.abs(diff) < 1e-6) return p1;
    const t = d1 / diff;
    return [
      p1[0] + t * (p2[0] - p1[0]),
      p1[1] + t * (p2[1] - p1[1])
    ];
  }

  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = isInside(cur);
    const prevIn = isInside(prev);

    if (curIn) {
      if (!prevIn) out.push(lineIntersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(lineIntersect(prev, cur));
    }
  }
  return out;
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Compute pairwise shared dividing hyperplanes
function computeTessellatedVoronoiCells(allMedians) {
  const N = allMedians.length;
  const BOX = [
    [-400, -400],
    [1424, -400],
    [1424, 1424],
    [-400, 1424]
  ];

  if (N <= 1) return [BOX];

  // For each pair (i, j) with i < j, find the dividing line L_{ij}
  const planes = []; // array of { i, j, mx, my, nx, ny }
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const { dist, pA, pB } = findClosestPairBetweenStrokes(allMedians[i], allMedians[j]);
      const mx = (pA[0] + pB[0]) / 2;
      const my = (pA[1] + pB[1]) / 2;
      // Normal points towards pA (stroke i)
      const nx = pA[0] - pB[0];
      const ny = pA[1] - pB[1];
      planes.push({ i, j, mx, my, nx, ny });
    }
  }

  // Now for each stroke k, clip BOX by the shared planes:
  // For plane between (i, j): if k == i, keep side +nx; if k == j, keep side -nx
  const cells = [];
  for (let k = 0; k < N; k++) {
    let poly = [...BOX];
    for (const plane of planes) {
      if (plane.i === k) {
        poly = clipPolygonByHalfPlane(poly, plane.mx, plane.my, plane.nx, plane.ny);
      } else if (plane.j === k) {
        // opposite side! exactly -nx, -ny
        poly = clipPolygonByHalfPlane(poly, plane.mx, plane.my, -plane.nx, -plane.ny);
      }
    }
    cells.push(poly);
  }

  return cells;
}

// Test on Cho_T1_ㄷ
const d = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));
const mediansD = d.parts['Cho_T1_ㄷ'].medians;
const cellsD = computeTessellatedVoronoiCells(mediansD);

console.log('Cell 0 vertices:', cellsD[0].length, cellsD[0]);
console.log('Cell 1 vertices:', cellsD[1].length, cellsD[1]);

// Test point test across grid: is every point in cell 0 or cell 1?
let missingCount = 0;
for (let y = 300; y <= 700; y += 10) {
  for (let x = 50; x <= 500; x += 10) {
    const in0 = pointInPolygon(x, y, cellsD[0]);
    const in1 = pointInPolygon(x, y, cellsD[1]);
    if (!in0 && !in1) {
      missingCount++;
    }
  }
}
console.log('Grid points tested in [50..500, 300..700]. Missing points (gap):', missingCount);
