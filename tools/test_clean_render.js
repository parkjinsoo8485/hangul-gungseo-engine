const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9370;
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
    '--window-size=1600,1000',
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
    await send('Page.enable');
    await sleep(2000);

    // Cho_T1_ㄷ 선택
    await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄷ")' });
    await sleep(800);

    // Voronoi 체이닝을 일시 해제하고 순수 렌더링 확인
    await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.getElementById('hanzi-preview-box');
        const svg = box.querySelector('svg');
        const defs = svg.querySelector('defs');
        // mask- 에서 clip-path 제거
        defs.querySelectorAll('clipPath[id^="mask-"]').forEach(cp => cp.removeAttribute('clip-path'));
        // wrapper 제거
        svg.querySelectorAll('.hw-voronoi-wrapper').forEach(w => {
          const p = w.firstElementChild;
          if (p) w.parentElement.insertBefore(p, w);
          w.remove();
        });
      })()`
    });

    // 붉은 획 애니메이션 재생
    await send('Runtime.evaluate', { expression: 'playPreviewAnim()' });

    // 1획 도중 스크린샷
    await sleep(600);
    let ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/project/한글획순/test_clean_stroke1.png', Buffer.from(ss.data, 'base64'));

    // 완료 후 스크린샷
    await sleep(2000);
    ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/project/한글획순/test_clean_complete.png', Buffer.from(ss.data, 'base64'));

    console.log('Saved clean screenshots!');
    ws.close();
  } finally {
    chrome.kill();
  }
})();
