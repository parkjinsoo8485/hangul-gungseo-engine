const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9491;
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

  // Apply the fix in browser
  await send('Runtime.evaluate', {
    expression: `(async () => {
      selectPart("Cho_T1_ㅂ");
      await new Promise(r => setTimeout(r, 600));

      const pid = currentPartId || selectedPartId || "Cho_T1_ㅂ";
      const count = currentPartData.medians.length;

      // Compute exact Voronoi paths
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

      function computeExactVoronoiClipPaths(medians, bounds, step = 4) {
        const pad = 40;
        const b = bounds || { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
        const x0 = Math.floor((b.minX - pad) / step) * step;
        const x1 = Math.ceil((b.maxX + pad) / step) * step;
        const y0 = Math.floor((b.minY - pad) / step) * step;
        const y1 = Math.ceil((b.maxY + pad) / step) * step;

        const cols = Math.round((x1 - x0) / step) + 1;
        const rows = Math.round((y1 - y0) / step) + 1;
        const K = medians.length;

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

        const paths = [];
        for (let k = 0; k < K; k++) {
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
          paths.push(rects.join(' '));
        }
        return paths;
      }

      const vPaths = computeExactVoronoiClipPaths(currentPartData.medians, currentPartData.outlineBounds, 4);

      const svg = document.querySelector('#hanzi-preview-box svg');
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
      }

      for (let k = 0; k < count; k++) {
        const clipId = \`hw-voronoi-clip-\${pid}-\${k}\`;
        let cp = svg.querySelector(\`#\${clipId}\`);
        if (!cp) {
          cp = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
          cp.id = clipId;
          const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          p.setAttribute('d', vPaths[k]);
          cp.appendChild(p);
          defs.appendChild(cp);
        } else {
          let p = cp.querySelector('path');
          if (!p) {
            p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            cp.appendChild(p);
          }
          p.setAttribute('d', vPaths[k]);
        }
      }

      // WRAP ALL PATHS REGARDLESS OF GROUP
      const allPaths = Array.from(svg.querySelectorAll('path'));
      const strokePaths = allPaths.filter(p => {
        const cp = p.getAttribute('clip-path') || '';
        const parent = p.parentNode;
        const parentHasClip = parent && parent.classList && parent.classList.contains('hw-voronoi-wrapper');
        return cp.includes('mask-') || parentHasClip;
      });

      console.log('Total strokePaths to wrap:', strokePaths.length);

      strokePaths.forEach((pathEl, idx) => {
        const sIdx = idx % count;
        const clipId = \`hw-voronoi-clip-\${pid}-\${sIdx}\`;
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

      ensureMasterGungsuhOutline();
    })()`,
    awaitPromise: true
  });

  await sleep(400);

  const boxEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('hanzi-preview-box');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`,
    returnByValue: true
  });
  const box = boxEval.result.value;

  // Reset and hide
  await send('Runtime.evaluate', {
    expression: 'previewWriter.hideCharacter({ duration: 0 });',
    awaitPromise: true
  });
  await sleep(150);

  // Animate Stroke 0
  await send('Runtime.evaluate', {
    expression: `new Promise(r => previewWriter.animateStroke(0, { strokeAnimationSpeed: 2.0, onComplete: r }));`,
    awaitPromise: true
  });
  const shotS0 = await send('Page.captureScreenshot', {
    format: 'png', clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
  });
  fs.writeFileSync('tools/fixed_stroke_0.png', Buffer.from(shotS0.data, 'base64'));

  // Animate Stroke 1
  await send('Runtime.evaluate', {
    expression: `new Promise(r => previewWriter.animateStroke(1, { strokeAnimationSpeed: 2.0, onComplete: r }));`,
    awaitPromise: true
  });
  const shotS1 = await send('Page.captureScreenshot', {
    format: 'png', clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
  });
  fs.writeFileSync('tools/fixed_stroke_1.png', Buffer.from(shotS1.data, 'base64'));

  // Animate Stroke 2
  await send('Runtime.evaluate', {
    expression: `new Promise(r => previewWriter.animateStroke(2, { strokeAnimationSpeed: 2.0, onComplete: r }));`,
    awaitPromise: true
  });
  const shotS2 = await send('Page.captureScreenshot', {
    format: 'png', clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
  });
  fs.writeFileSync('tools/fixed_stroke_2.png', Buffer.from(shotS2.data, 'base64'));

  // Animate Stroke 3
  await send('Runtime.evaluate', {
    expression: `new Promise(r => previewWriter.animateStroke(3, { strokeAnimationSpeed: 2.0, onComplete: r }));`,
    awaitPromise: true
  });
  const shotS3 = await send('Page.captureScreenshot', {
    format: 'png', clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
  });
  fs.writeFileSync('tools/fixed_stroke_3.png', Buffer.from(shotS3.data, 'base64'));

  console.log('Saved all 4 fixed_stroke images!');
  ws.close();
  chrome.kill();
})();
