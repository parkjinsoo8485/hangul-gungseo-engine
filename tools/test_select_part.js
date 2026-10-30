const { spawn } = require('child_process');
const http = require('http');

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

  ws.addEventListener('message', evt => {
    const d = JSON.parse(evt.data);
    if (d.method === 'Runtime.consoleAPICalled') {
      console.log('[CONSOLE]', d.params.type, d.params.args.map(a => a.value));
    }
  });

  await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㅂ")' });
  await sleep(1000);

  console.log('--- Calling playPreviewAnim() ---');
  await send('Runtime.evaluate', { expression: 'playPreviewAnim()' });
  await sleep(2500);

  const check = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('btn-play-red-anim');
      const box = document.getElementById('hanzi-preview-box');
      const paths = box ? Array.from(box.querySelectorAll('path')) : [];
      return {
        btnText: btn ? btn.innerText : null,
        pathsCount: paths.length,
        strokePaths: paths.filter(p => (p.getAttribute('clip-path') || '').includes('mask-')).map(p => ({
          clip: p.getAttribute('clip-path'),
          stroke: p.getAttribute('stroke'),
          strokeWidth: p.getAttribute('stroke-width'),
          opacity: p.style.opacity || p.getAttribute('opacity')
        }))
      };
    })()`,
    returnByValue: true
  });
  console.log('After anim state:');
  console.log(JSON.stringify(check.result.value, null, 2));

  ws.close();
  chrome.kill();
})();
