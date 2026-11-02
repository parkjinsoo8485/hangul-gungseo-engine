const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9481;
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

  ws.addEventListener('message', evt => {
    const d = JSON.parse(evt.data);
    if (d.method === 'Runtime.consoleAPICalled') {
      console.log('CONSOLE:', d.params.type, d.params.args.map(a => a.value || JSON.stringify(a)).join(' '));
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await sleep(1500);

  // Select Cho_T1_ㅂ
  await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㅂ");' });
  await sleep(600);

  // Test hideCharacter then animateCharacter
  const testRes = await send('Runtime.evaluate', {
    expression: `(async () => {
      console.log('Calling hideCharacter duration 0...');
      await previewWriter.hideCharacter({ duration: 0 });
      console.log('hideCharacter finished! Now calling animateCharacter...');
      const p = new Promise(resolve => {
        previewWriter.animateCharacter({
          strokeAnimationSpeed: 1.0,
          delayBetweenStrokes: 100,
          onComplete: (res) => {
            console.log('animateCharacter onComplete called:', JSON.stringify(res));
            resolve(res);
          }
        });
      });
      const res = await p;
      return res;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Result:', testRes.result.value);

  // Now capture screenshot of finished animation
  const boxEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('hanzi-preview-box');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`,
    returnByValue: true
  });
  const box = boxEval.result.value;
  const shotDone = await send('Page.captureScreenshot', {
    format: 'png', clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 }
  });
  fs.writeFileSync('tools/preview_shot_after_chain.png', Buffer.from(shotDone.data, 'base64'));
  console.log('Saved tools/preview_shot_after_chain.png');

  ws.close();
  chrome.kill();
})();
