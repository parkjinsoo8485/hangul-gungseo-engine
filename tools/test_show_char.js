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
  await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㅂ")' });
  await sleep(1000);

  // Test calling showCharacter()
  await send('Runtime.evaluate', {
    expression: `(() => {
      previewWriter.showCharacter();
      syncHanziWriterStrokeWidth();
    })()`
  });
  await sleep(500);

  const boxRectEval = await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.getElementById('hanzi-preview-box');
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`,
    returnByValue: true
  });
  const boxRect = boxRectEval.result.value;

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
  fs.writeFileSync('tools/test_show_char.png', Buffer.from(snap.data, 'base64'));
  console.log('Saved test_show_char.png');

  ws.close();
  chrome.kill();
})();
