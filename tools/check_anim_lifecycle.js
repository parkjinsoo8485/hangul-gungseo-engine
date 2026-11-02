const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9372;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve) => {
    const req = http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
  });
}

(async () => {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });

  try {
    let targets = null;
    for (let i = 0; i < 40; i++) {
      await sleep(300);
      try {
        const res = await getJson(`http://127.0.0.1:${PORT}/json`);
        if (Array.isArray(res) && res.length > 0) {
          targets = res;
          break;
        }
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
          if (d.id === id) {
            ws.removeEventListener('message', listener);
            resolve(d.result);
          }
        };
        ws.addEventListener('message', listener);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Runtime.enable');
    await sleep(2000);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('item-Cho_T1_ㄷ');
        if (el) el.click();
      })()`
    });
    await sleep(1000);

    console.log('Playing anim...');
    await send('Runtime.evaluate', { expression: 'playPreviewAnim()' });

    // 0.5초, 1.0초, 2.0초, 3.5초에 상태 체크
    for (const waitTime of [500, 1000, 2000, 3500]) {
      await sleep(waitTime);
      const check = await send('Runtime.evaluate', {
        expression: `(() => {
          const box = document.getElementById('hanzi-preview-box');
          const svg = box ? box.querySelector('svg') : null;
          if (!svg) return 'no svg';
          const paths = Array.from(svg.querySelectorAll('path')).map(p => ({
            d_len: p.getAttribute('d') ? p.getAttribute('d').length : 0,
            cp: p.getAttribute('clip-path'),
            parentTag: p.parentElement.tagName,
            parentOp: p.parentElement.style.opacity || p.parentElement.getAttribute('opacity'),
            pOp: p.style.opacity || p.getAttribute('opacity'),
            stroke: p.getAttribute('stroke'),
            dashOffset: p.getAttribute('stroke-dashoffset') || p.style.strokeDashoffset,
            dashArray: p.getAttribute('stroke-dasharray') || p.style.strokeDasharray
          }));
          return { waitTime: ${waitTime}, paths };
        })()`,
        returnByValue: true
      });
      console.log(`--- At +${waitTime}ms ---`);
      console.log(JSON.stringify(check.result.value, null, 2));
    }

    ws.close();
  } finally {
    chrome.kill();
  }
})();
