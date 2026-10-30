const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9496;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const chrome = spawn(CHROME_PATH, [
    '--remote-debugging-port=' + PORT,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1200,900',
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 40; i++) {
    await sleep(200);
    try {
      const res = await new Promise(r => {
        http.get('http://127.0.0.1:' + PORT + '/json', resp => {
          let d = ''; resp.on('data', c => d += c);
          resp.on('end', () => { try { r(JSON.parse(d)); } catch(e){ r(null); } });
        }).on('error', () => r(null));
      });
      if (Array.isArray(res) && res.length > 0) {
        const found = res.find(t => t.type === 'page' && t.url.includes('view_150_warehouse_gallery'));
        if (found) { targets = [found]; break; }
      }
    } catch(e) {}
  }

  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
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
  await send('Page.enable');
  await sleep(1500);

  // Inject exact Moore Voronoi into view_150_warehouse_gallery.html
  await send('Runtime.evaluate', {
    expression: `(() => {
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

      window.computeTessellatedVoronoiCells = function(allMedians, outlinePath = '') {
        const N = allMedians.length;
        const BOX = [[-400, -400], [1424, -400], [1424, 1424], [-400, 1424]];
        if (N <= 1) return [BOX];

        const bounds = (currentPartData && currentPartData.outlineBounds) || { minX: 50, maxX: 950, minY: 50, maxY: 950 };
        const step = 4;
        const pad = 70;
        const x0 = Math.floor((bounds.minX - pad) / step) * step;
        const x1 = Math.ceil((bounds.maxX + pad) / step) * step;
        const y0 = Math.floor((bounds.minY - pad) / step) * step;
        const y1 = Math.ceil((bounds.maxY + pad) / step) * step;

        const cols = Math.round((x1 - x0) / step) + 1;
        const rows = Math.round((y1 - y0) / step) + 1;

        const grid = new Int32Array(cols * rows);
        for (let r = 0; r < rows; r++) {
          const py = y0 + r * step;
          for (let c = 0; c < cols; c++) {
            const px = x0 + c * step;
            let minD = Infinity;
            let bestK = 0;
            for (let k = 0; k < N; k++) {
              const d = distToPolyline(px, py, allMedians[k]);
              if (d < minD) {
                minD = d;
                bestK = k;
              }
            }
            grid[r * cols + c] = bestK;
          }
        }

        const DIRS = [
          [1, 0], [1, 1], [0, 1], [-1, 1],
          [-1, 0], [-1, -1], [0, -1], [1, -1]
        ];

        const cells = [];
        for (let k = 0; k < N; k++) {
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
            cells.push(BOX);
            continue;
          }

          const boundary = [];
          let curC = startC, curR = startR;
          let dir = 0;
          const maxSteps = cols * rows;
          let stepCount = 0;
          boundary.push([x0 + curC * step, y0 + curR * step]);

          while (stepCount++ < maxSteps) {
            let found = false;
            for (let i = 0; i < 8; i++) {
              const checkDir = (dir + 5 + i) % 8;
              const nc = curC + DIRS[checkDir][0];
              const nr = curR + DIRS[checkDir][1];
              if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && grid[nr * cols + nc] === k) {
                curC = nc; curR = nr; dir = checkDir; found = true;
                boundary.push([x0 + curC * step, y0 + curR * step]);
                break;
              }
            }
            if (!found || (curC === startC && curR === startR)) break;
          }

          const simplified = rdpSimplify(boundary, 4.0);
          cells.push(simplified.length >= 3 ? simplified : BOX);
        }

        return cells;
      };

      // Update playPreviewAnim to sequential animation
      window.playPreviewAnim = async function() {
        if (!previewWriter || !currentPartData) return;
        ensureStrokeWidths(currentPartData);

        const playBtn = document.getElementById('btn-play-red-anim');
        if (playBtn) {
          playBtn.innerHTML = '🔄 애니메이션 재생 중...';
          playBtn.style.opacity = '0.8';
        }

        ensureMasterGungsuhOutline();
        syncHanziWriterStrokeWidth();
        applyHanziChainedVoronoi();

        await previewWriter.hideCharacter({ duration: 0 });
        applyHanziChainedVoronoi();
        syncHanziWriterStrokeWidth();

        const count = currentPartData.medians.length;
        for (let s = 0; s < count; s++) {
          await new Promise(r => {
            previewWriter.animateStroke(s, {
              strokeAnimationSpeed: animSpeedMultiplier,
              onComplete: r
            });
          });
          if (s < count - 1 && animStrokeDelay > 0) {
            await new Promise(r => setTimeout(r, animStrokeDelay));
          }
        }

        ensureMasterGungsuhOutline();
        syncHanziWriterStrokeWidth();
        if (playBtn) {
          playBtn.innerHTML = '▶ 붉은 획 애니메이션 재생';
          playBtn.style.opacity = '1.0';
        }
        showToast(\`[\${selectedPartId}] 붉은 획 획순 애니메이션 재생 완료!\`, 'success');
      };
    })()`
  });

  // Select Cho_T1_ㅂ and play animation
  await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㅂ");' });
  await sleep(600);

  console.log('Triggering playPreviewAnim()...');
  await send('Runtime.evaluate', { expression: 'playPreviewAnim();' });

  // Wait 3.5s for playback to finish
  await sleep(3500);

  // Capture final screenshot
  const boxEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('hanzi-preview-box');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`,
    returnByValue: true
  });
  const box = boxEval.result.value;

  const shot = await send('Page.captureScreenshot', {
    format: 'png', clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
  });
  fs.writeFileSync('tools/preview_after_play_btn.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved tools/preview_after_play_btn.png');

  ws.close();
  chrome.kill();
})();
