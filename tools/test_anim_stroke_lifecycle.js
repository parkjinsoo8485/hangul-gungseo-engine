const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9993;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--disable-gpu', '--disable-extensions',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_j_' + PORT,
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
  await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㅈ")' });
  await sleep(1000);

  // Initial state of paths
  const getPaths = () => send('Runtime.evaluate', {
    expression: `(() => {
      const box = document.getElementById('hanzi-preview-box');
      const paths = box ? Array.from(box.querySelectorAll('path')) : [];
      return paths.map((p, idx) => ({
        idx,
        clip: p.getAttribute('clip-path'),
        d: (p.getAttribute('d') || '').slice(0, 30),
        stroke: p.getAttribute('stroke'),
        opacity: p.style.opacity || p.getAttribute('opacity'),
        parentStyle: p.parentNode ? p.parentNode.getAttribute('style') : null
      }));
    })()`,
    returnByValue: true
  });

  console.log('--- Initial Paths ---');
  console.log((await getPaths()).result.value.filter(p => p.stroke === '#ef4444'));

  // Run animateStroke(0)
  console.log('--- Running animateStroke(0) ---');
  await send('Runtime.evaluate', {
    expression: `previewWriter.animateStroke(0, { strokeAnimationSpeed: 5 })`,
    awaitPromise: true
  });
  await sleep(400);

  console.log('--- After animateStroke(0) Paths ---');
  console.log((await getPaths()).result.value.filter(p => p.stroke === '#ef4444'));

  // Run animateStroke(1)
  console.log('--- Running animateStroke(1) ---');
  await send('Runtime.evaluate', {
    expression: `previewWriter.animateStroke(1, { strokeAnimationSpeed: 5 })`,
    awaitPromise: true
  });
  await sleep(400);

  console.log('--- After animateStroke(1) Paths ---');
  console.log((await getPaths()).result.value.filter(p => p.stroke === '#ef4444'));

  ws.close();
  chrome.kill();
})();
