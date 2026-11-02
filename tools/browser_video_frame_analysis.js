const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9372;

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

    // Test a set of representative parts
    const testPartIds = ['Cho_T1_ㄷ', 'Cho_T1_ㅂ', 'Cho_T1_ㄹ', 'Cho_T2_ㅋ', 'Jung_T1_ㅒ'];

    for (const pid of testPartIds) {
      console.log(`\n==================================================`);
      console.log(`🎥 [Video Frame Analysis] Testing ${pid}...`);
      console.log(`==================================================`);

      await send('Runtime.evaluate', { expression: `selectPart("${pid}")` });
      await sleep(500);

      const animResult = await send('Runtime.evaluate', {
        expression: `new Promise((resolve) => {
          const svg = document.querySelector('#hanzi-preview-box svg');
          if (!svg) return resolve({ error: 'no svg' });

          const W = 300, H = 300;
          const canvas = document.createElement('canvas');
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext('2d');

          const frames = [];
          let isRunning = true;
          let startTime = performance.now();

          // Hook frame sampling
          function captureFrame() {
            if (!isRunning) return;
            const xml = new XMLSerializer().serializeToString(svg);
            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, W, H);
              ctx.drawImage(img, 0, 0, W, H);
              const imgData = ctx.getImageData(0, 0, W, H);
              const d = imgData.data;

              let redCount = 0;
              let minX = W, maxX = 0, minY = H, maxY = 0;
              let sumX = 0, sumY = 0;

              for (let y = 0; y < H; y++) {
                for (let x = 0; x < W; x++) {
                  const idx = (y * W + x) * 4;
                  const r = d[idx], g = d[idx + 1], b = d[idx + 2], a = d[idx + 3];
                  // Red stroke color in HanziWriter: #ef4444 (r: 239, g: 68, b: 68)
                  if (a > 100 && r > 180 && g < 100 && b < 100) {
                    redCount++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    sumX += x;
                    sumY += y;
                  }
                }
              }

              const elapsed = Math.round(performance.now() - startTime);
              frames.push({
                t: elapsed,
                redCount,
                bbox: redCount > 0 ? [minX, minY, maxX, maxY] : null,
                centroid: redCount > 0 ? [Math.round(sumX / redCount), Math.round(sumY / redCount)] : null
              });

              if (isRunning) {
                setTimeout(captureFrame, 60); // sample every ~60ms
              }
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
          }

          // Trigger animation
          playPreviewAnim();
          captureFrame();

          // Wait 2.2 seconds for full animation
          setTimeout(() => {
            isRunning = false;
            resolve({
              pid: "${pid}",
              totalFrames: frames.length,
              frames
            });
          }, 2200);
        })`,
        awaitPromise: true,
        returnByValue: true
      });

      const data = animResult.result.value;
      if (data.error) {
        console.error('Error:', data.error);
        continue;
      }

      console.log(`Captured ${data.totalFrames} video frames over 2.2s`);
      const sampleFrames = data.frames.filter((_, i) => i % 5 === 0 || i === data.frames.length - 1);
      sampleFrames.forEach(f => {
        console.log(` Frame t=${f.t}ms | Red Pixels: ${f.redCount} | Centroid: ${JSON.stringify(f.centroid)} | BBox: ${JSON.stringify(f.bbox)}`);
      });

      // Verification checks:
      const firstActive = data.frames.find(f => f.redCount > 0);
      const lastFrame = data.frames[data.frames.length - 1];

      console.log(`\nAnalysis for ${pid}:`);
      console.log(` - Animation Start Time: ${firstActive ? firstActive.t + 'ms' : 'NEVER STARTED!'}`);
      console.log(` - Final Red Pixels: ${lastFrame.redCount}`);
      console.log(` - Final Bounding Box: ${JSON.stringify(lastFrame.bbox)}`);

      // Check monotonicity of red pixel growth (strokes sequentially fill in)
      let decreases = 0;
      for (let i = 1; i < data.frames.length; i++) {
        if (data.frames[i].redCount < data.frames[i - 1].redCount - 50) {
          decreases++;
        }
      }
      console.log(` - Sudden red pixel drops/glitches: ${decreases}`);
    }

    ws.close();
  } finally {
    chrome.kill();
  }
})();
