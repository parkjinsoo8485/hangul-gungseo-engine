const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9380;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise(resolve => {
    http.get(url, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(null); } });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1200,900',
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
      return new Promise(resolve => {
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
    await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄷ")' });
    await sleep(500);

    const domInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.getElementById('hanzi-preview-box');
        const svg = box ? box.querySelector('svg') : null;
        if (!svg) return { err: 'no svg' };

        const defsPaths = Array.from(svg.querySelectorAll('defs clipPath path')).map(p => ({
          parentClipId: p.parentNode.id,
          d: p.getAttribute('d'),
          strokeWidth: p.getAttribute('stroke-width'),
          stroke: p.getAttribute('stroke'),
          strokeLinecap: p.getAttribute('stroke-linecap'),
          strokeLinejoin: p.getAttribute('stroke-linejoin'),
          dashArray: p.getAttribute('stroke-dasharray'),
          dashOffset: p.getAttribute('stroke-dashoffset')
        }));

        const bodyPaths = Array.from(svg.querySelectorAll(':scope > g path, :scope > g g path')).map(p => ({
          d_prefix: (p.getAttribute('d') || '').slice(0, 30),
          clipPath: p.getAttribute('clip-path'),
          parentTag: p.parentNode.tagName,
          parentClass: p.parentNode.getAttribute('class'),
          parentClipPath: p.parentNode.getAttribute('clip-path'),
          fill: p.getAttribute('fill'),
          stroke: p.getAttribute('stroke'),
          strokeWidth: p.getAttribute('stroke-width')
        }));

        return { defsPaths, bodyPaths };
      })()`,
      returnByValue: true
    });

    console.log(JSON.stringify(domInfo.result.value, null, 2));
    ws.close();
  } finally {
    chrome.kill();
  }
})();
