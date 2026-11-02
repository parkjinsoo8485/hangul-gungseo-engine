// Voronoi 수학 테스트: 1번(uA-uB) 제거 후 결과 확인
const polyStart = [
  [-400, -400],
  [1424, -400],
  [1424, 1424],
  [-400, 1424]
];

function sampleMedian(pts, step = 25) {
  if (!pts || pts.length === 0) return [];
  const samples = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
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

function computeCleanVoronoi(strokeIdx, allMedians) {
  let poly = [
    [-400, -400],
    [1424, -400],
    [1424, 1424],
    [-400, 1424]
  ];

  const curMedian = allMedians[strokeIdx];
  if (!curMedian || curMedian.length === 0 || allMedians.length <= 1) return poly;

  const curSamples = sampleMedian(curMedian, 25);

  for (let otherIdx = 0; otherIdx < allMedians.length; otherIdx++) {
    if (otherIdx === strokeIdx) continue;
    const otherMedian = allMedians[otherIdx];
    if (!otherMedian || otherMedian.length === 0) continue;
    const otherSamples = sampleMedian(otherMedian, 25);

    // 각 샘플 쌍 중 가장 가까운 점들에 대해 수직이등분선 클리핑
    // curSamples에서 다른 선분과의 거리가 가까운 주요 샘플들 대상
    for (let a = 0; a < curSamples.length; a++) {
      if (poly.length > 50) break;
      const pA = curSamples[a];
      let minDist = Infinity;
      let bestB = null;

      for (let b = 0; b < otherSamples.length; b++) {
        const pB = otherSamples[b];
        const d = Math.hypot(pA[0] - pB[0], pA[1] - pB[1]);
        if (d < minDist) {
          minDist = d;
          bestB = pB;
        }
      }

      if (bestB && minDist >= 5) {
        const mx = (pA[0] + bestB[0]) / 2;
        const my = (pA[1] + bestB[1]) / 2;
        const nx = pA[0] - bestB[0];
        const ny = pA[1] - bestB[1];
        const clipped = clipPolygonByHalfPlane(poly, mx, my, nx, ny);
        if (clipped && clipped.length >= 3) {
          poly = clipped;
        }
      }
    }
  }

  return poly;
}

// Cho_T1_ㄷ 테스트
const m0 = [[93, 609], [240, 599], [426, 633]];
const m1 = [[176, 583], [198, 423], [318, 420], [467, 431]];
const allM = [m0, m1];

const v0 = computeCleanVoronoi(0, allM);
const v1 = computeCleanVoronoi(1, allM);

console.log('v0 vertices:', v0.length);
console.log('m0 in v0:', m0.map(p => pointInPolygon(p[0], p[1], v0)));
console.log('v1 vertices:', v1.length);
console.log('m1 in v1:', m1.map(p => pointInPolygon(p[0], p[1], v1)));
