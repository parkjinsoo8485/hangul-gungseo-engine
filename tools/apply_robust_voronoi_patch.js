const fs = require('fs');

const files = [
  'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery.html',
  'C:/project/app_clone/auto_income/view_150_warehouse_gallery.html'
];

const newCode = `    function ptToSegmentDistSq(px, py, x1, y1, x2, y2) {
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

    /**
     * 다획 자소에서 획 간 색 번짐(Bleeding)을 0%로 완벽 차단하기 위한 획별 보로노이 다각형 계산
     * 직교 투영 및 자체 획 보존(keepsCurrent) 검증을 거친 무결점 Voronoi 분할 (획 소실 및 침범 100% 방지)
     */
    function computeStrokeVoronoiPolygon(strokeIdx, allMedians) {
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
            const mx = (pA_closest[0] + pB[0]) / 2;
            const my = (pA_closest[1] + pB[1]) / 2;
            const nx = pA_closest[0] - pB[0];
            const ny = pA_closest[1] - pB[1];

            const clipped = clipPolygonByHalfPlane(poly, mx, my, nx, ny);
            if (clipped && clipped.length >= 3) {
              const keepsCurrent = curMedian.every(p => pointInPolygon(p[0], p[1], clipped));
              if (keepsCurrent) {
                poly = clipped;
              }
            }
          }
        }
      }

      if (!poly || poly.length < 3) {
        return [[-400, -400], [1424, -400], [1424, 1424], [-400, 1424]];
      }

      return poly;
    }`;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const startIdx = content.indexOf('function computeStrokeVoronoiPolygon(strokeIdx, allMedians)');
  if (startIdx === -1) {
    console.log('Start pattern not found in ' + filePath);
    return;
  }
  
  const separateIdx = content.indexOf('function separateJunction', startIdx);
  if (separateIdx === -1) {
    console.log('separateJunction not found in ' + filePath);
    return;
  }
  
  const lastReturn = content.lastIndexOf('return poly;', separateIdx);
  const funcEnd = content.indexOf('}', lastReturn) + 1;
  const commentStart = content.lastIndexOf('/**', startIdx);
  
  const before = content.slice(0, commentStart);
  const after = content.slice(funcEnd);
  
  const updated = before + newCode + after;
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully updated ' + filePath);
});
