const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9989;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--disable-gpu', '--disable-extensions',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_' + PORT,
    '--window-size=1600,1000',
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });
  await sleep(1500);
  const tabs = await new Promise(r => {
    http.get('http://127.0.0.1:' + PORT + '/json', resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => r(JSON.parse(d)));
    });
  });
  const page = tabs.find(t => t.type === 'page' && t.url.includes('view_150'));
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

  ws.addEventListener('message', evt => {
    const d = JSON.parse(evt.data);
    if (d.method === 'Runtime.consoleAPICalled') {
      console.log('[CONSOLE]', d.params.type, d.params.args.map(a => a.value));
    }
  });

  await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㅂ")' });
  await sleep(800);

  console.log('--- Clicking [▶ 붉은 획 애니메이션 재생] ---');
  await send('Runtime.evaluate', { expression: 'document.getElementById("btn-play-red-anim").click()' });

  // Wait for 4 strokes to animate
  await sleep(3500);

  const status = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('btn-play-red-anim');
      const box = document.getElementById('hanzi-preview-box');
      const defs = box ? box.querySelector('defs') : null;
      const hwClips = defs ? Array.from(defs.querySelectorAll('clipPath')).filter(c => c.id && c.id.startsWith('hw-voronoi-clip-')) : [];
      return {
        btnText: btn ? btn.innerText : null,
        hwClipsCount: hwClips.length
      };
    })()`,
    returnByValue: true
  });
  console.log('Native execution status:', status.result.value);

  // Capture HanziWriter preview box screenshot
  const snap = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 814, y: 117, width: 340, height: 340, scale: 1 }
  });
  fs.writeFileSync('tools/native_anim_result.png', Buffer.from(snap.data, 'base64'));
  console.log('Saved tools/native_anim_result.png');

  ws.close();
  chrome.kill();
})();
