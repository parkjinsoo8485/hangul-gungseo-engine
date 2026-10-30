const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9375;

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
  console.log('================================================================');
  console.log('🎥 [전수 동영상 프레임 정밀 분석] 153개 자소 브라우저 실시간 픽셀 검증');
  console.log('================================================================');

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
    if (!targets) throw new Error('Chrome target not found');

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

    // Get list of all 153 part IDs
    const partIdsRes = await send('Runtime.evaluate', {
      expression: 'Object.keys(window.HANGUL_150_WAREHOUSE.parts)',
      returnByValue: true
    });
    const allPartIds = partIdsRes.result.value;
    console.log(`총 대상 자소: ${allPartIds.length}개`);

    // In-browser frame analyzer function
    await send('Runtime.evaluate', {
      expression: `
        window.analyzePartVideoFrames = function(pid) {
          return new Promise((resolve) => {
            selectPart(pid);
            ensureMasterGungsuhOutline();
            syncHanziWriterStrokeWidth();
            applyHanziChainedVoronoi();

            const svg = document.querySelector('#hanzi-preview-box svg');
            if (!svg) return resolve({ pid, err: 'no svg' });

            const W = 300, H = 300;
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d');

            const frames = [];
            let isRunning = true;
            let startTime = performance.now();

            function capture() {
              if (!isRunning) return;
              try {
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
                      if (a > 80 && r > 180 && g < 110 && b < 110) {
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

                  frames.push({
                    t: Math.round(performance.now() - startTime),
                    redCount,
                    bbox: redCount > 0 ? [minX, minY, maxX, maxY] : null,
                    centroid: redCount > 0 ? [Math.round(sumX / redCount), Math.round(sumY / redCount)] : null
                  });

                  if (isRunning) {
                    setTimeout(capture, 35);
                  }
                };
                img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
              } catch(e) {
                if (isRunning) setTimeout(capture, 35);
              }
            }

            // Start animation at high-speed for fast, deterministic frame-by-frame profiling
            if (previewWriter) {
              previewWriter.hideCharacter({ duration: 0 });
              previewWriter.animateCharacter({
                strokeAnimationSpeed: 2.0,
                delayBetweenStrokes: 80,
                onComplete: () => {}
              });
            }

            capture();

            const expectedDuration = Math.max(700, (currentPartData.medians.length * 280));
            setTimeout(() => {
              isRunning = false;
              const firstRed = frames.find(f => f.redCount > 100);
              const lastFrame = frames[frames.length - 1] || { redCount: 0 };
              
              resolve({
                pid,
                totalFrames: frames.length,
                strokeCount: currentPartData.medians.length,
                firstRedTime: firstRed ? firstRed.t : -1,
                firstRedCount: firstRed ? firstRed.redCount : 0,
                finalRedCount: lastFrame.redCount,
                finalBBox: lastFrame.bbox,
                hasAnimation: firstRed !== undefined && lastFrame.redCount > 600
              });
            }, expectedDuration + 150);
          });
        };
      `
    });

    let passCount = 0;
    let failCount = 0;
    const failures = [];

    // Analyze in sequential batches
    for (let i = 0; i < allPartIds.length; i++) {
      const pid = allPartIds[i];
      const res = await send('Runtime.evaluate', {
        expression: `window.analyzePartVideoFrames("${pid}")`,
        awaitPromise: true,
        returnByValue: true
      });

      const r = res.result.value;
      if (r && r.hasAnimation && r.finalRedCount > 600) {
        passCount++;
        if (i % 20 === 0 || i === allPartIds.length - 1) {
          console.log(`[${i + 1}/${allPartIds.length}] ${pid} (${r.strokeCount}획): ✅ PASS (Frames: ${r.totalFrames}, Final Red: ${r.finalRedCount}px, BBox: ${JSON.stringify(r.finalBBox)})`);
        }
      } else {
        failCount++;
        failures.push(r);
        console.error(`[${i + 1}/${allPartIds.length}] ${pid}: ❌ FAIL (${JSON.stringify(r)})`);
      }
    }

    console.log(`\n================================================================`);
    console.log(`전수 동영상 프레임 정밀 분석 완료:`);
    console.log(`- 통과(PASS): ${passCount} / ${allPartIds.length}`);
    console.log(`- 결함(FAIL): ${failCount} / ${allPartIds.length}`);
    if (failCount > 0) {
      console.log('결함 자소 목록:', failures);
    }
    console.log(`================================================================`);

    ws.close();
  } finally {
    chrome.kill();
  }
})();
