const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9494;
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

  // Run sequential animation on Cho_T1_ㅂ
  const res = await send('Runtime.evaluate', {
    expression: `(async () => {
      selectPart("Cho_T1_ㅂ");
      await new Promise(r => setTimeout(r, 600));

      const count = currentPartData.medians.length;
      console.log('Hiding character...');
      await previewWriter.hideCharacter({ duration: 0 });

      console.log('Playing sequential strokes...');
      for (let s = 0; s < count; s++) {
        console.log('Animating stroke ' + s + '...');
        await new Promise(res => {
          previewWriter.animateStroke(s, {
            strokeAnimationSpeed: 2.0,
            onComplete: res
          });
        });
        await new Promise(r => setTimeout(r, 80));
      }

      console.log('All strokes finished sequentially!');
      return { success: true, count };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Result:', res.result.value);

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

  const shotFinal = await send('Page.captureScreenshot', {
    format: 'png', clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
  });
  fs.writeFileSync('tools/sequential_done.png', Buffer.from(shotFinal.data, 'base64'));
  console.log('Saved tools/sequential_done.png');

  ws.close();
  chrome.kill();
})();
