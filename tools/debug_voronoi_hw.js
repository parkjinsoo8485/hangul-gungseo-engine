const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));
const part = data.parts['Cho_T1_ㅂ'];

function closestPointOnSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: ax, y: ay, dist: Math.hypot(px - ax, py - ay) };
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return { x: cx, y: cy, dist: Math.hypot(px - cx, py - cy) };
}

function closestPointOnStroke(px, py, median) {
  let minD = Infinity;
  let best = { x: median[0][0], y: median[0][1], dist: Infinity };
  for (let i = 0; i < median.length - 1; i++) {
    const res = closestPointOnSegment(px, py, median[i][0], median[i][1], median[i+1][0], median[i+1][1]);
    if (res.dist < minD) {
      minD = res.dist;
      best = res;
    }
  }
  return best;
}

function findClosestPairBetweenStrokes(strokeA, strokeB) {
  let minD = Infinity;
  let pA = strokeA[0], pB = strokeB[0];
  for (let i = 0; i < strokeA.length; i++) {
    const ptA = strokeA[i];
    const res = closestPointOnStroke(ptA[0], ptA[1], strokeB);
    if (res.dist < minD) {
      minD = res.dist;
      pA = ptA;
      pB = [res.x, res.y];
    }
  }
  for (let j = 0; j < strokeB.length; j++) {
    const ptB = strokeB[j];
    const res = closestPointOnStroke(ptB[0], ptB[1], strokeA);
    if (res.dist < minD) {
      minD = res.dist;
      pB = ptB;
      pA = [res.x, res.y];
    }
  }
  return { dist: minD, pA, pB };
}

function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function clipPolygonByHalfPlane(poly, mx, my, nx, ny) {
  const result = [];
  const len = poly.length;
  for (let i = 0; i < len; i++) {
    const cur = poly[i];
    const nxt = poly[(i + 1) % len];
    const curVal = (cur[0] - mx) * nx + (cur[1] - my) * ny;
    const nxtVal = (nxt[0] - mx) * nx + (nxt[1] - my) * ny;
    if (curVal >= 0) result.push(cur);
    if ((curVal >= 0 && nxtVal < 0) || (curVal < 0 && nxtVal >= 0)) {
      const t = curVal / (curVal - nxtVal);
      result.push([cur[0] + t * (nxt[0] - cur[0]), cur[1] + t * (nxt[1] - cur[1])]);
    }
  }
  return result;
}

const allMedians = part.medians;
const N = allMedians.length;
console.log('Medians:', N);
for (let i = 0; i < N; i++) {
  for (let j = i + 1; j < N; j++) {
    const pair = findClosestPairBetweenStrokes(allMedians[i], allMedians[j]);
    console.log(`Pair (${i}, ${j}): dist = ${pair.dist.toFixed(1)}, pA = ${pair.pA}, pB = ${pair.pB}`);
  }
}
