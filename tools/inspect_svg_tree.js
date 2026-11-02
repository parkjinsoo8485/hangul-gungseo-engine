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
      res.on('end', () => resolve(JSON.parse(data)));
    });
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
    await sleep(2000);
    const targets = await getJson(`http://127.0.0.1:${PORT}/json`);
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
    await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄷ")' });
    await sleep(800);

    const tree = await send('Runtime.evaluate', {
      expression: `(() => {
        try {
          const box = document.getElementById('hanzi-preview-box');
          const svg = box ? box.querySelector('svg') : null;
          if (!svg) return 'no svg';
          
          function summarizeNode(el, depth = 0) {
            const tag = el.tagName;
            const id = el.id ? '#' + el.id : '';
            const cls = el.getAttribute('class') ? '.' + el.getAttribute('class') : '';
            const cp = el.getAttribute('clip-path') ? ' clip-path=' + el.getAttribute('clip-path') : '';
            const d = el.getAttribute('d') ? ' d_len=' + el.getAttribute('d').length : '';
            const stroke = el.getAttribute('stroke') ? ' stroke=' + el.getAttribute('stroke') : '';
            const opacity = el.style.opacity || el.getAttribute('opacity') || '';
            const opStr = opacity ? ' op=' + opacity : '';
            
            let res = '  '.repeat(depth) + '<' + tag + id + cls + cp + d + stroke + opStr + '>\\n';
            for (let i = 0; i < el.children.length; i++) {
              res += summarizeNode(el.children[i], depth + 1);
            }
            return res;
          }

          return summarizeNode(svg);
        } catch(e) {
          return 'ERR: ' + e.message + ' ' + e.stack;
        }
      })()`,
      returnByValue: true
    });

    console.log('SVG Tree:\n', tree.result.value);

    ws.close();
  } finally {
    chrome.kill();
  }
})();
