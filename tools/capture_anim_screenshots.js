const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9362;
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
    if (!targets) throw new Error('No targets found');

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
    await sleep(1500);

    // 1. Cho_T1_ㄷ 선택
    console.log('Selecting Cho_T1_ㄷ...');
    await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄷ")' });
    await sleep(800);

    // 스크린샷 1: 선택 직후 (초기 상태)
    let ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/project/한글획순/test_shot_initial.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved test_shot_initial.png');

    // 2. 붉은 획 애니메이션 클릭
    console.log('Triggering playPreviewAnim()...');
    await send('Runtime.evaluate', { expression: 'playPreviewAnim()' });

    // 3. 1획 진행 중 (약 600ms 후)
    await sleep(600);
    ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/project/한글획순/test_shot_stroke1.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved test_shot_stroke1.png');

    // 4. 애니메이션 완료 후 (약 2500ms 후)
    await sleep(2500);
    ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/project/한글획순/test_shot_complete.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved test_shot_complete.png');

    ws.close();
  } finally {
    chrome.kill();
  }
})();
