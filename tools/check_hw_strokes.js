const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9371;
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

    // 1. Cho_T1_ㄷ 클릭 시뮬레이션:
    // 실제 갤러리 UI에서 .part-item 클릭하듯 아이템 클릭
    const clickRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.getElementById('item-Cho_T1_ㄷ');
        if (el) { el.click(); return 'clicked'; }
        selectPart('Cho_T1_ㄷ');
        return 'selected directly';
      })()`,
      returnByValue: true
    });
    console.log('Click result:', clickRes.result.value);
    await sleep(1000);

    const hwStatus = await send('Runtime.evaluate', {
      expression: `(() => {
        const char = previewWriter ? previewWriter._character : null;
        if (!char) return 'no char in writer';
        return {
          symbol: char.symbol,
          strokeCount: char.strokes.length,
          strokes: char.strokes.map(s => ({
            trackPath: s.trackPath ? s.trackPath.getAttribute('d') : null,
            clipPath: s.clipPath,
            points: s.points
          }))
        };
      })()`,
      returnByValue: true
    });
    console.log('HanziWriter status for ㄷ:\n', JSON.stringify(hwStatus.result.value, null, 2));

    ws.close();
  } finally {
    chrome.kill();
  }
})();
