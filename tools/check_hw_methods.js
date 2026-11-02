const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9988;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });
  await sleep(1500);
  const tabs = await new Promise(r => {
    http.get('http://127.0.0.1:' + PORT + '/json', resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => r(JSON.parse(d)));
    });
  });
  const page = tabs.find(t => t.type === 'page');
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
  await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㅂ")' });
  await sleep(1000);

  const check = await send('Runtime.evaluate', {
    expression: `(() => {
      const p = previewWriter;
      const box = document.getElementById('hanzi-preview-box');
      return {
        hasWriter: !!p,
        hasAnimateStroke: typeof (p && p.animateStroke),
        hasAnimateCharacter: typeof (p && p.animateCharacter),
        boxHtml: box ? box.innerHTML.slice(0, 300) : ''
      };
    })()`,
    returnByValue: true
  });
  console.log('HanziWriter check:', check.result.value);

  // Test animateCharacter
  const animTest = await send('Runtime.evaluate', {
    expression: `(() => {
      const res = previewWriter.animateCharacter();
      return { returnsPromise: !!(res && res.then) };
    })()`,
    returnByValue: true
  });
  console.log('animateCharacter returns promise:', animTest.result.value);

  await sleep(1000);
  const pathCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const box = document.getElementById('hanzi-preview-box');
      const paths = box ? Array.from(box.querySelectorAll('path')) : [];
      return {
        pathCount: paths.length,
        paths: paths.map(p => ({
          dStart: (p.getAttribute('d') || '').slice(0, 30),
          clip: p.getAttribute('clip-path'),
          stroke: p.getAttribute('stroke'),
          strokeWidth: p.getAttribute('stroke-width'),
          opacity: p.style.opacity || p.getAttribute('opacity')
        }))
      };
    })()`,
    returnByValue: true
  });
  console.log('Paths in previewWriter after anim:', pathCheck.result.value);

  ws.close();
  chrome.kill();
})();
