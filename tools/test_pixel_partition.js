const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9495;

(async () => {
  const chrome = spawn(CHROME_PATH, [
    '--remote-debugging-port=' + PORT,
    '--headless=new',
    '--disable-gpu',
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });

  setTimeout(async () => {
    const tabs = await new Promise(r => {
      http.get('http://127.0.0.1:' + PORT + '/json', resp => {
        let d = ''; resp.on('data', c => d += c);
        resp.on('end', () => r(JSON.parse(d)));
      });
    });
    const page = tabs.find(t => t.type === 'page' && t.url.includes('view_150'));
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    function send(method, params={}) {
      return new Promise((resolve, reject) => {
        const curId = id++;
        const l = evt => {
          const d = JSON.parse(evt.data);
          if (d.id === curId) {
            ws.removeEventListener('message', l);
            if (d.error) reject(d.error);
            else resolve(d.result);
          }
        };
        ws.addEventListener('message', l);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await send('Runtime.enable');

    // Test pixel voronoi partitioning on Cho_T1_ㅂ
    const res = await send('Runtime.evaluate', {
      expression: `(() => {
        const db = window.HANGUL_150_WAREHOUSE;
        if (!db) return { err: 'no HANGUL_150_WAREHOUSE' };
        const p = db.parts['Cho_T1_ㅂ'];
        const medians = p.medians;
        const K = medians.length;

        // Render gungsuhOutline to canvas
        const W = 1024, H = 1024;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const path2d = new Path2D(p.gungsuhOutline);
        ctx.fillStyle = '#000000';
        ctx.fill(path2d);

        const imgData = ctx.getImageData(0, 0, W, H).data;

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

        // Count ink pixels for each stroke
        const strokePixelCounts = new Int32Array(K);
        let totalInk = 0;

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const idx = (y * W + x) * 4;
            if (imgData[idx + 3] > 60) {
              totalInk++;
              // Note: Canvas Y is 0 at top, 1024 at bottom.
              // In SVG path gungsuhOutline, Y is already in this canvas space!
              let minD = Infinity;
              let bestK = 0;
              for (let k = 0; k < K; k++) {
                const d = distToPolyline(x, y, medians[k]);
                if (d < minD) {
                  minD = d;
                  bestK = k;
                }
              }
              strokePixelCounts[bestK]++;
            }
          }
        }

        return {
          totalInk,
          strokePixelCounts: Array.from(strokePixelCounts)
        };
      })()`,
      returnByValue: true
    });

    console.log('Partition result:', res.result.value);

    ws.close();
    chrome.kill();
    process.exit(0);
  }, 1500);
})();
