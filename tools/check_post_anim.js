const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9364;
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
    await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄷ")' });
    await sleep(800);

    // playPreviewAnim 실행
    console.log('Calling playPreviewAnim()...');
    await send('Runtime.evaluate', { expression: 'playPreviewAnim()' });
    // 애니메이션 완전히 끝날 때까지 4초 대기
    await sleep(4000);

    const postAnim = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.getElementById('hanzi-preview-box');
        const svg = box ? box.querySelector('svg') : null;
        if (!svg) return 'no svg';
        
        function summarizeNode(el, depth = 0) {
          const tag = el.tagName;
          const id = el.id ? '#' + el.id : '';
          const cls = el.getAttribute('class') ? '.' + el.getAttribute('class') : '';
          const cp = el.getAttribute('clip-path') ? ' cp=' + el.getAttribute('clip-path') : '';
          const stroke = el.getAttribute('stroke') ? ' str=' + el.getAttribute('stroke') : '';
          const opacity = el.style.opacity || el.getAttribute('opacity') || '';
          const opStr = opacity ? ' op=' + opacity : '';
          const sw = el.getAttribute('stroke-width') || el.style.strokeWidth || '';
          const swStr = sw ? ' sw=' + sw : '';
          
          let res = '  '.repeat(depth) + '<' + tag + id + cls + cp + stroke + opStr + swStr + '>\\n';
          for (let i = 0; i < el.children.length; i++) {
            res += summarizeNode(el.children[i], depth + 1);
          }
          return res;
        }

        return summarizeNode(svg);
      })()`,
      returnByValue: true
    });

    console.log('Post Animation Tree:\n', postAnim.result.value);

    ws.close();
  } finally {
    chrome.kill();
  }
})();
