const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9363;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1600,1000',
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
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
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

    const testParts = ['Cho_T1_ㄷ', 'Cho_T1_ㅂ', 'Cho_T1_ㄹ', 'Cho_T2_ㅋ', 'Jung_T1_ㅒ'];
    for (const pid of testParts) {
      await send('Runtime.evaluate', { expression: `selectPart("${pid}")` });
      await sleep(600);
      await send('Runtime.evaluate', { expression: 'playPreviewAnim()' });
      await sleep(2500); // wait for anim to complete

      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const box = document.getElementById('hanzi-preview-box');
          const svg = box ? box.querySelector('svg') : null;
          if (!svg) return { err: 'no svg' };
          const defs = svg.querySelector('defs');
          const clips = defs ? Array.from(defs.querySelectorAll('clipPath')).map(c => ({ id: c.id, poly: c.querySelector('polygon') ? c.querySelector('polygon').getAttribute('points').slice(0, 30) : 'none' })) : [];
          const paths = Array.from(svg.querySelectorAll('path')).map(p => ({
            d_prefix: p.getAttribute('d') ? p.getAttribute('d').slice(0, 20) : '',
            clipPath: p.getAttribute('clip-path'),
            stroke: p.getAttribute('stroke'),
            fill: p.getAttribute('fill'),
            opacity: p.getAttribute('opacity') || p.style.opacity
          }));
          return { pid: "${pid}", clipCount: clips.length, pathCount: paths.length, clips, paths: paths.slice(0, 6) };
        })()`,
        returnByValue: true
      });
      console.log(JSON.stringify(res.result.value, null, 2));
    }
    ws.close();
  } finally {
    chrome.kill();
  }
})();
