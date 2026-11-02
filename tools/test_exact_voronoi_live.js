const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9977;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_' + PORT,
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });

  let list = null;
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const res = await new Promise(r => {
        http.get('http://127.0.0.1:' + PORT + '/json', resp => {
          let d = ''; resp.on('data', c => d += c);
          resp.on('end', () => { try { r(JSON.parse(d)); } catch(e){ r(null); } });
        }).on('error', () => r(null));
      });
      if (Array.isArray(res) && res.length > 0) { list = res; break; }
    } catch(e) {}
  }

  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const l = evt => {
      const d = JSON.parse(evt.data);
      if (d.id === curId) {
        ws.removeEventListener('message', l);
        if (d.error) reject(d.error); else resolve(d.result);
      }
    };
    ws.addEventListener('message', l);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await sleep(1500);

  // Inject exact voronoi functions
  await send('Runtime.evaluate', {
    expression: `
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
      function computeExactVoronoiSpanPaths(medians, bounds, step = 4) {
        const pad = 60;
        const b = bounds || { minX: 0, maxX: 1024, minY: 0, maxY: 1024 };
        const x0 = Math.max(-200, Math.floor((b.minX - pad) / step) * step);
        const x1 = Math.min(1224, Math.ceil((b.maxX + pad) / step) * step);
        const y0 = Math.max(-200, Math.floor((b.minY - pad) / step) * step);
        const y1 = Math.min(1224, Math.ceil((b.maxY + pad) / step) * step);

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
              if (d < minD) { minD = d; bestK = k; }
            }
            grid[r * cols + c] = bestK;
          }
        }

        const cells = [];
        for (let k = 0; k < K; k++) {
          const dParts = [];
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
                dParts.push('M ' + (x0 + startC * step) + ' ' + py + ' H ' + (x0 + c * step) + ' V ' + (py + step) + ' H ' + (x0 + startC * step) + ' Z');
              }
            }
            if (inSpan) {
              dParts.push('M ' + (x0 + startC * step) + ' ' + py + ' H ' + (x0 + cols * step) + ' V ' + (py + step) + ' H ' + (x0 + startC * step) + ' Z');
            }
          }
          cells.push(dParts.join(' '));
        }
        return cells;
      }

      window.applyHanziChainedVoronoi = function() {
        const box = document.getElementById('hanzi-preview-box');
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
        const vSpanPaths = computeExactVoronoiSpanPaths(currentPartData.medians, currentPartData.outlineBounds, 4);
        for (let sIdx = 0; sIdx < count; sIdx++) {
          const dStr = vSpanPaths[sIdx];
          const clipId = 'hw-voronoi-clip-' + selectedPartId + '-' + sIdx;
          let vClip = svg.querySelector('#' + clipId);
          if (!vClip) {
            vClip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            vClip.id = clipId;
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', dStr);
            vClip.appendChild(pathEl);
            defs.appendChild(vClip);
          } else {
            let pathEl = vClip.querySelector('path');
            if (!pathEl) {
              vClip.innerHTML = '';
              pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              vClip.appendChild(pathEl);
            }
            pathEl.setAttribute('d', dStr);
          }
        }

        const hwMaskClips = Array.from(defs.querySelectorAll('clipPath')).filter(cp => cp.id && cp.id.startsWith('mask-'));
        hwMaskClips.forEach((cp, idx) => {
          const sIdx = idx % count;
          const clipId = 'hw-voronoi-clip-' + selectedPartId + '-' + sIdx;
          cp.setAttribute('clip-path', 'url(#' + clipId + ')');
        });
      };

      window.syncHanziWriterStrokeWidth = function() {
        const box = document.getElementById('hanzi-preview-box');
        if (!box || !currentPartData) return;
        const svg = box.querySelector('svg');
        if (!svg) return;
        const allPaths = Array.from(svg.querySelectorAll('path'));
        const strokePaths = allPaths.filter(p => {
          const cp = p.getAttribute('clip-path') || '';
          return cp.includes('mask-');
        });
        const groupCounters = new Map();
        strokePaths.forEach((p) => {
          const layer = p.parentNode;
          const pIdx = groupCounters.get(layer) || 0;
          groupCounters.set(layer, pIdx + 1);
          const targetW = (currentPartData.strokeWidths && currentPartData.strokeWidths[pIdx]) || currentStrokeWidth || 48;
          const fillW = Math.max(160, Math.min(Math.round(targetW * 3.8), 220));
          p.setAttribute('stroke-width', fillW + '');
          p.style.strokeWidth = fillW + 'px';
          p.setAttribute('stroke-linecap', 'round');
          p.setAttribute('stroke-linejoin', 'round');
          p.setAttribute('stroke', '#ef4444');
          p.style.stroke = '#ef4444';
        });
      };
    `
  });

  // Select Cho_T1_ㅂ
  await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㅂ")' });
  await sleep(600);

  // Apply fixes
  await send('Runtime.evaluate', {
    expression: `
      applyHanziChainedVoronoi();
      syncHanziWriterStrokeWidth();
    `
  });

  // Get bounding rect of hanzi-preview-box
  const boxRectEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('hanzi-preview-box');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`,
    returnByValue: true
  });
  const boxRect = boxRectEval.result.value;
  console.log('hanzi-preview-box rect:', boxRect);

  // Reset and hide character
  await send('Runtime.evaluate', { expression: 'previewWriter.hideCharacter({ duration: 0 })' });
  await sleep(150);

  for (let s = 0; s < 4; s++) {
    await send('Runtime.evaluate', {
      expression: `
        new Promise(res => {
          previewWriter.animateStroke(${s}, {
            strokeAnimationSpeed: 10,
            delayBetweenStrokes: 0,
            onComplete: res
          });
        })
      `,
      awaitPromise: true
    });
    await sleep(150);
    const snap = await send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: Math.round(boxRect.x),
        y: Math.round(boxRect.y),
        width: Math.round(boxRect.width),
        height: Math.round(boxRect.height),
        scale: 1
      }
    });
    fs.writeFileSync('tools/box_snap_s' + s + '.png', Buffer.from(snap.data, 'base64'));
    console.log('Captured box stroke ' + s);
  }

  ws.close();
  chrome.kill();
  console.log('Finished live test!');
})();
