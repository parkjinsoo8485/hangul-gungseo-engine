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
  await send('Runtime.evaluate', { expression: `selectPart("Cho_T1_ㅈ")` });
  await sleep(600);

  const defsData = await send('Runtime.evaluate', {
    expression: `(() => {
      const box = document.getElementById('hanzi-preview-box');
      const defs = box.querySelector('defs');
      return Array.from(defs.children).map(c => ({
        tag: c.tagName,
        id: c.id,
        clipPath: c.getAttribute('clip-path'),
        d: (c.querySelector('path') || {}).getAttribute ? c.querySelector('path').getAttribute('d').slice(0, 50) : null
      }));
    })()`,
    returnByValue: true
  });
  console.log('Defs children:\n', JSON.stringify(defsData.result.value, null, 2));

  // Let's also check the actual rendered groups and which clip-path they use!
  const groupsData = await send('Runtime.evaluate', {
    expression: `(() => {
      const box = document.getElementById('hanzi-preview-box');
      const groups = Array.from(box.querySelectorAll('g'));
      return groups.map(g => ({
        tag: g.tagName,
        id: g.id,
        clipPath: g.getAttribute('clip-path'),
        transform: g.getAttribute('transform'),
        childCount: g.children.length
      }));
    })()`,
    returnByValue: true
  });
  console.log('Groups:\n', JSON.stringify(groupsData.result.value, null, 2));

  ws.close();
  chrome.kill();
})();
