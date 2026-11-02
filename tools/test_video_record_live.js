const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9480;

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
  console.log('Connecting to headless Chrome for real frame capture...');
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
      await sleep(250);
      try {
        const res = await getJson(`http://127.0.0.1:${PORT}/json`);
        if (Array.isArray(res) && res.length > 0) {
          const found = res.find(t => t.type === 'page' && t.url.includes('view_150_warehouse_gallery'));
          if (found) { targets = [found]; break; }
        }
      } catch (e) {}
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
    await sleep(2000);

    // Test video recording on Cho_T1_ㅂ
    const res = await send('Runtime.evaluate', {
      expression: `(async () => {
        selectPart('Cho_T1_ㅂ');
        await new Promise(r => setTimeout(r, 400));

        const svg = document.querySelector('#hanzi-preview-box svg');
        if (!svg) return { err: 'no svg' };

        const W = 300, H = 300;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Play animation
        playPreviewAnim();

        // Record 15 frames during playback
        const frames = [];
        for (let f = 0; f < 15; f++) {
          await new Promise(r => setTimeout(r, 120));
          
          // Draw SVG to canvas
          const xml = new XMLSerializer().serializeToString(svg);
          const img = new Image();
          await new Promise(resImg => {
            img.onload = resImg;
            img.onerror = resImg;
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
          });

          ctx.clearRect(0, 0, W, H);
          ctx.drawImage(img, 0, 0, W, H);
          const imgData = ctx.getImageData(0, 0, W, H).data;

          let redPixels = 0;
          let minX = W, maxX = 0, minY = H, maxY = 0;
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const idx = (y * W + x) * 4;
              const r = imgData[idx], g = imgData[idx + 1], b = imgData[idx + 2], a = imgData[idx + 3];
              // Red stroke detector
              if (a > 60 && r > 180 && g < 110 && b < 110) {
                redPixels++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          frames.push({
            frame: f,
            redPixels,
            bbox: redPixels > 0 ? [minX, minY, maxX, maxY] : null
          });
        }

        return { pid: 'Cho_T1_ㅂ', frames };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Recorded video frames result:', JSON.stringify(res.value, null, 2));

    ws.close();
    chrome.kill();
  } catch (err) {
    console.error('Error:', err);
    try { chrome.kill(); } catch (e) {}
    process.exit(1);
  }
})();
