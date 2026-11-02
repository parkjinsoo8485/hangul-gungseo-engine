const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9497;
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

  // Inject span-based exact Voronoi
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

      window.computeExactVoronoiSpanPaths = function(allMedians) {
        const N = allMedians.length;
        if (N <= 1) return ['M -400 -400 H 1424 V 1424 H -400 Z'];

        const bounds = (currentPartData && currentPartData.outlineBounds) || { minX: 50, maxX: 950, minY: 50, maxY: 950 };
        const step = 4;
        const pad = 80;
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

        const paths = [];
        for (let k = 0; k < N; k++) {
          const rects = [];
          for (let r = 0; r < rows; r++) {
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
                rects.push(\`M \${x0 + startC * step} \${py} H \${x0 + c * step} V \${py + step} H \${x0 + startC * step} Z\`);
              }
            }
            if (inSpan) {
              rects.push(\`M \${x0 + startC * step} \${py} H \${x0 + cols * step} V \${py + step} H \${x0 + startC * step} Z\`);
            }
          }
          paths.push(rects.length > 0 ? rects.join(' ') : 'M -400 -400 H 1424 V 1424 H -400 Z');
        }

        return paths;
      };

      window.applyHanziChainedVoronoi = function() {
        const box = document.getElementById("hanzi-preview-box");
        if (!box || !currentPartData || !currentPartData.medians) return;
        const count = currentPartData.medians.length;
        if (count <= 1) return;

        const svg = box.querySelector('svg');
        if (!svg) return;
        let defs = svg.querySelector('defs');
        if (!defs) {
          defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
          svg.insertBefore(defs, svg.firstChild);
        }

        const vPaths = computeExactVoronoiSpanPaths(currentPartData.medians);

        for (let sIdx = 0; sIdx < count; sIdx++) {
          const clipId = \`hw-voronoi-clip-\${selectedPartId}-\${sIdx}\`;
          let vClip = svg.querySelector(\`#\${clipId}\`);
          if (!vClip) {
            vClip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            vClip.id = clipId;
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', vPaths[sIdx]);
            vClip.appendChild(pathEl);
            defs.appendChild(vClip);
          } else {
            let pathEl = vClip.querySelector('path');
            if (!pathEl) {
              vClip.innerHTML = '';
              pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              vClip.appendChild(pathEl);
            }
            pathEl.setAttribute('d', vPaths[sIdx]);
          }
        }

        const allPaths = Array.from(svg.querySelectorAll('path'));
        const strokePaths = allPaths.filter(p => {
          const cp = p.getAttribute('clip-path') || '';
          const parent = p.parentNode;
          const parentHasClip = parent && parent.classList && parent.classList.contains('hw-voronoi-wrapper');
          return cp.includes('mask-') || parentHasClip;
        });

        strokePaths.forEach((pathEl, idx) => {
          const sIdx = idx % count;
          const clipId = \`hw-voronoi-clip-\${selectedPartId}-\${sIdx}\`;
          const parent = pathEl.parentNode;
          if (!parent) return;

          if (parent.classList && parent.classList.contains('hw-voronoi-wrapper')) {
            parent.setAttribute('clip-path', \`url(#\${clipId})\`);
          } else {
            const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            wrapper.setAttribute('class', 'hw-voronoi-wrapper');
            wrapper.setAttribute('clip-path', \`url(#\${clipId})\`);
            parent.insertBefore(wrapper, pathEl);
            wrapper.appendChild(pathEl);
          }

          pathEl.setAttribute('stroke-width', '180');
          pathEl.style.strokeWidth = '180px';
          pathEl.setAttribute('stroke-linecap', 'round');
          pathEl.setAttribute('stroke-linejoin', 'round');
          pathEl.setAttribute('stroke', '#ef4444');
          pathEl.style.stroke = '#ef4444';
        });
      };

      // Sequential playback implementation
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
          applyHanziChainedVoronoi();
          syncHanziWriterStrokeWidth();
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

  // Select Cho_T1_ㅂ and play
  await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㅂ");' });
  await sleep(600);

  console.log('Triggering span-based playPreviewAnim()...');
  await send('Runtime.evaluate', { expression: 'playPreviewAnim();' });

  // Wait for 4 seconds for full sequential completion
  await sleep(4000);

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
  fs.writeFileSync('tools/span_playback_done.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved tools/span_playback_done.png');

  ws.close();
  chrome.kill();
})();
