const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9989;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--disable-gpu', '--disable-extensions',
    '--remote-debugging-port=' + PORT,
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
  await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㅂ")' });
  await sleep(800);

  const clipCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const res = [];
      for (let i = 0; i < 4; i++) {
        const el = document.getElementById('hw-voronoi-clip-Cho_T1_ㅂ-' + i);
        const poly = el ? el.querySelector('polygon') : null;
        res.push({
          stroke: i,
          points: poly ? poly.getAttribute('points') : null
        });
      }
      return res;
    })()`,
    returnByValue: true
  });
  console.log('All 4 clip points:');
  console.log(JSON.stringify(clipCheck.result.value, null, 2));

  ws.close();
  chrome.kill();
})();
