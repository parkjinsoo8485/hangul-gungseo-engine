const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9381;
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

    const testParts = ['Cho_T1_ㄷ', 'Cho_T1_ㄱ', 'Cho_T1_ㅂ', 'Cho_T1_ㄹ', 'Cho_T2_ㅋ'];

    for (const pid of testParts) {
      await send('Runtime.evaluate', { expression: `selectPart("${pid}")` });
      await sleep(400);

      // Analyze coverage:
      // Compare Outline Pixels vs Animated Red Pixels
      const coverageRes = await send('Runtime.evaluate', {
        expression: `new Promise((resolve) => {
          const svg = document.querySelector('#hanzi-preview-box svg');
          const outlineD = currentPartData.gungsuhOutline || currentPartData.strokes[0];
          
          const W = 300, H = 300;
          const canvas = document.createElement('canvas');
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext('2d');

          // 1. Draw pure outline in black to get total target pixels
          const outlineSvg = '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1024 1024\" width=\"300\" height=\"300\"><g transform=\"scale(1, -1) translate(0, -900)\"><path d=\"' + outlineD + '\" fill=\"#000000\" /></g></svg>';
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
              // Capture final rendered state of SVG
              const xml = new XMLSerializer().serializeToString(svg);
              const imgAnim = new Image();
              imgAnim.onload = () => {
                ctx.clearRect(0, 0, W, H);
                ctx.drawImage(imgAnim, 0, 0, W, H);
                const animData = ctx.getImageData(0, 0, W, H).data;

                let redFilled = 0;
                let redOutside = 0; // bleeding outside outline
                let emptyInside = 0; // unfilled space inside outline

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
