const fs = require('fs');

const filePaths = [
  'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery.html',
  'C:/project/app_clone/auto_income/view_150_warehouse_gallery.html'
];

filePaths.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  const helperDefs = `    function distToSegmentSq(px, py, x1, y1, x2, y2) {
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
        const d = distToSegmentSq(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
        if (d < minD) minD = d;
      }
      return Math.sqrt(minD);
    }

    /**
     * 다획 자소에서 획 간 빈틈 0%, 침범 0%, 외곽선 절삭 0%를 보장하는 무결점 로버스트 테셀레이션 보로노이 분할
     */
    function computeExactVoronoiSpanPaths`;

  const target = `    /**
     * 다획 자소에서 획 간 빈틈 0%, 침범 0%, 외곽선 절삭 0%를 보장하는 무결점 로버스트 테셀레이션 보로노이 분할
     */
    function computeExactVoronoiSpanPaths`;

  if (content.includes(target) && !content.includes('function distToPolyline')) {
    content = content.replace(target, helperDefs);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Added distToPolyline to', filePath);
  } else {
    console.log('distToPolyline already present or target not found in', filePath);
  }
});
