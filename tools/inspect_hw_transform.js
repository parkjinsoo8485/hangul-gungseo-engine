const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9384;
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
    await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄱ")' });
    await sleep(400);

    const bboxes = await send('Runtime.evaluate', {
      expression: `(() => {
        const svg = document.querySelector('#hanzi-preview-box svg');
        const mainG = svg.querySelector('g[transform]');
        const transformStr = mainG ? mainG.getAttribute('transform') : '';

        // Check all paths in svg and their fill/stroke
        const paths = Array.from(svg.querySelectorAll('path')).map(p => ({
          d_prefix: (p.getAttribute('d') || '').slice(0, 30),
          fill: p.getAttribute('fill') || p.style.fill,
          stroke: p.getAttribute('stroke') || p.style.stroke,
          clipPath: p.getAttribute('clip-path'),
          parentTag: p.parentNode.tagName,
          parentClass: p.parentNode.getAttribute('class'),
          opacity: p.getAttribute('opacity') || p.style.opacity,
          display: p.style.display
        }));

        return { transformStr, paths };
      })()`,
      returnByValue: true
    });

    console.log(JSON.stringify(bboxes.result.value, null, 2));
    ws.close();
  } finally {
    chrome.kill();
  }
})();
