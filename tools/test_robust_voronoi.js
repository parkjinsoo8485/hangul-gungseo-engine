// 안전 Voronoi 검증 테스트
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

function sampleMedian(pts, step = 30) {
  const samples = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1];
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const numSub = Math.max(1, Math.ceil(segLen / step));
    for (let j = 0; j <= numSub; j++) {
      const t = j / numSub;
      samples.push([
        p1[0] + t * (p2[0] - p1[0]),
        p1[1] + t * (p2[1] - p1[1])
      ]);
    }
  }
  return samples;
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

function computeRobustStrokeVoronoi(strokeIdx, allMedians) {
  let poly = [
    [-400, -400],
    [1424, -400],
    [1424, 1424],
    [-400, 1424]
  ];

  const curMedian = allMedians[strokeIdx];
  if (!curMedian || curMedian.length === 0 || allMedians.length <= 1) return poly;

  for (let otherIdx = 0; otherIdx < allMedians.length; otherIdx++) {
    if (otherIdx === strokeIdx) continue;
    const otherMedian = allMedians[otherIdx];
    if (!otherMedian || otherMedian.length === 0) continue;

    const otherSamples = sampleMedian(otherMedian, 25);

    for (let b = 0; b < otherSamples.length; b++) {
      if (poly.length > 50) break;
      const pB = otherSamples[b];
      const { dist, pt: pA_closest } = closestPointOnStroke(pB[0], pB[1], curMedian);

      if (dist >= 14) {
        // 중점 M
        const mx = (pA_closest[0] + pB[0]) / 2;
        const my = (pA_closest[1] + pB[1]) / 2;
        // 법선: pB -> pA_closest
        const nx = pA_closest[0] - pB[0];
        const ny = pA_closest[1] - pB[1];

        const clipped = clipPolygonByHalfPlane(poly, mx, my, nx, ny);
        // 안전 검증: 현재 획의 점들이 잘려나가지 않는지 검증!
        if (clipped && clipped.length >= 3) {
          const keepsCurrent = curMedian.every(p => pointInPolygon(p[0], p[1], clipped));
          if (keepsCurrent) {
            poly = clipped;
          }
        }
      }
    }
  }

  return poly;
}

// 153개 전체 자소에 대해 테스트!
const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));
const parts = Object.values(d.parts);

let failCount = 0;
parts.forEach(p => {
  if (p.medians.length > 1) {
    p.medians.forEach((m, sIdx) => {
      const v = computeRobustStrokeVoronoi(sIdx, p.medians);
      const allIn = m.every(pt => pointInPolygon(pt[0], pt[1], v));
      if (!allIn) {
        failCount++;
        console.log(`FAIL in ${p.id} stroke ${sIdx+1}`);
      }
    });
  }
});

console.log(`Tested all multi-stroke parts: Failures = ${failCount}`);
