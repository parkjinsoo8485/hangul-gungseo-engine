const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9383;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise(resolve => {
    http.get(url, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1200,900',
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });

  try {
    let targets = null;
    for (let i = 0; i < 40; i++) {
      await sleep(300);
      try {
        const res = await getJson(`http://127.0.0.1:${PORT}/json`);
        if (Array.isArray(res) && res.length > 0) { targets = res; break; }
      } catch (e) {}
    }
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise(resolve => {
        const id = msgId++;
        const listener = (evt) => {
          const d = JSON.parse(evt.data);
          if (d.id === id) { ws.removeEventListener('message', listener); resolve(d.result); }
        };
        ws.addEventListener('message', listener);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Runtime.enable');
    await sleep(2000);

    // Inject tessellated Voronoi and enhanced stroke width directly in page context
    await send('Runtime.evaluate', {
      expression: `
        // Test injected exact tessellated Voronoi
        window.computeTessellatedVoronoiCells = function(allMedians) {
          const N = allMedians.length;
          const BOX = [[-400, -400], [1424, -400], [1424, 1424], [-400, 1424]];
          if (N <= 1) return [BOX];

          const planes = [];
          for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
              let minDist = Infinity;
              let bestA = allMedians[i][0], bestB = allMedians[j][0];
              for (const pA of allMedians[i]) {
                const { dist, pt } = closestPointOnStroke(pA[0], pA[1], allMedians[j]);
                if (dist < minDist) { minDist = dist; bestA = pA; bestB = pt; }
              }
              for (const pB of allMedians[j]) {
                const { dist, pt } = closestPointOnStroke(pB[0], pB[1], allMedians[i]);
                if (dist < minDist) { minDist = dist; bestA = pt; bestB = pB; }
              }
              if (minDist >= 8) {
                const mx = (bestA[0] + bestB[0]) / 2;
                const my = (bestA[1] + bestB[1]) / 2;
                const nx = bestA[0] - bestB[0];
                const ny = bestA[1] - bestB[1];
                planes.push({ i, j, mx, my, nx, ny });
              }
            }
          }

          const cells = [];
          for (let k = 0; k < N; k++) {
            let poly = [...BOX];
            for (const plane of planes) {
              let cand;
              if (plane.i === k) cand = clipPolygonByHalfPlane(poly, plane.mx, plane.my, plane.nx, plane.ny);
              else if (plane.j === k) cand = clipPolygonByHalfPlane(poly, plane.mx, plane.my, -plane.nx, -plane.ny);
              if (cand && cand.length >= 3) {
                const keeps = allMedians[k].every(pt => pointInPolygon(pt[0], pt[1], cand));
                if (keeps) poly = cand;
              }
            }
            cells.push(poly);
          }
          return cells;
        };

        window.computeStrokeVoronoiPolygon = function(strokeIdx, allMedians) {
          const cells = window.computeTessellatedVoronoiCells(allMedians);
          return cells[strokeIdx] || [[-400, -400], [1424, -400], [1424, 1424], [-400, 1424]];
        };

        window.syncHanziWriterStrokeWidth = function() {
          const box = document.getElementById('hanzi-preview-box');
          if (!box || !currentPartData) return;
          const svg = box.querySelector('svg');
          if (!svg) return;

          const allPaths = Array.from(svg.querySelectorAll('path'));
          const strokePaths = allPaths.filter(p => {
            const cp = p.getAttribute('clip-path') || '';
            const parent = p.parentNode;
            const parentHasClip = parent && parent.classList && parent.classList.contains('hw-voronoi-wrapper');
            return cp.includes('mask-') || parentHasClip;
          });

          if (strokePaths.length > 0) {
            const groupCounters = new Map();
            strokePaths.forEach((p) => {
              const layer = p.parentNode;
              const pIdx = groupCounters.get(layer) || 0;
              groupCounters.set(layer, pIdx + 1);

              const targetW = (currentPartData.strokeWidths && currentPartData.strokeWidths[pIdx]) || currentStrokeWidth || 48;
              const fillW = Math.max(160, Math.min(Math.round(targetW * 3.0), 220));
              p.setAttribute('stroke-width', fillW + '');
              p.style.strokeWidth = fillW + 'px';
              p.setAttribute('stroke', '#ef4444');
              p.style.stroke = '#ef4444';
              p.setAttribute('stroke-linecap', 'round');
              p.setAttribute('stroke-linejoin', 'round');
            });
          }
        };
      `
    });

    const testParts = ['Cho_T1_ㄷ', 'Cho_T1_ㄱ', 'Cho_T1_ㅂ', 'Cho_T1_ㄹ', 'Cho_T2_ㅋ'];

    for (const pid of testParts) {
      await send('Runtime.evaluate', { expression: `selectPart("${pid}")` });
      await sleep(300);

      // Measure coverage with pixel accuracy matching HanziWriter's viewport
      const coverageRes = await send('Runtime.evaluate', {
        expression: `new Promise((resolve) => {
          const svg = document.querySelector('#hanzi-preview-box svg');
          const outlineD = currentPartData.gungsuhOutline || currentPartData.strokes[0];

          // HanziWriter dimensions: 340x340, padding: 10, scale: 0.3125, translate(10, 291.25)
          const W = 340, H = 340;
          const canvas = document.createElement('canvas');
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext('2d');

          // 1. Draw outline with the EXACT SAME transform as HanziWriter
          const outlineSvg = '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"340\" height=\"340\"><g transform=\"translate(10, 291.25) scale(0.3125, -0.3125)\"><path d=\"' + outlineD + '\" fill=\"#000000\" /></g></svg>';
          const imgOutline = new Image();
          imgOutline.onload = () => {
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(imgOutline, 0, 0, W, H);
            const outlineData = ctx.getImageData(0, 0, W, H).data;
            let targetPixels = 0;
            const targetMask = new Uint8Array(W * H);
            for (let i = 0; i < outlineData.length; i += 4) {
              if (outlineData[i + 3] > 80) {
                targetPixels++;
                targetMask[i / 4] = 1;
              }
            }

            // 2. Play animation and wait for completion
            playPreviewAnim();

            setTimeout(() => {
              const xml = new XMLSerializer().serializeToString(svg);
              const imgAnim = new Image();
              imgAnim.onload = () => {
                ctx.clearRect(0, 0, W, H);
                ctx.drawImage(imgAnim, 0, 0, W, H);
                const animData = ctx.getImageData(0, 0, W, H).data;

                let redFilled = 0;
                let redOutside = 0;
                let emptyInside = 0;

                for (let i = 0; i < animData.length; i += 4) {
                  const pixelIdx = i / 4;
                  const isTarget = targetMask[pixelIdx] === 1;
                  const isRed = (animData[i + 3] > 80 && animData[i] > 180 && animData[i + 1] < 110 && animData[i + 2] < 110);

                  if (isTarget && isRed) redFilled++;
                  else if (!isTarget && isRed) redOutside++;
                  else if (isTarget && !isRed) emptyInside++;
                }

                const coverageRatio = targetPixels > 0 ? (redFilled / targetPixels) : 1;
                resolve({
                  pid: "${pid}",
                  targetPixels,
                  redFilled,
                  emptyInside,
                  redOutside,
                  coverageRatio: (coverageRatio * 100).toFixed(1) + '%'
                });
              };
              imgAnim.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
            }, 1800);
          };
          imgOutline.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(outlineSvg)));
        })`,
        awaitPromise: true,
        returnByValue: true
      });

      console.log(`Coverage for ${pid}:`, JSON.stringify(coverageRes.result.value, null, 2));
    }

    ws.close();
  } finally {
    chrome.kill();
  }
})();
