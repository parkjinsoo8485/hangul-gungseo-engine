const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9366;
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

    const hwObj = await send('Runtime.evaluate', {
      expression: `(() => {
        if (!previewWriter) return 'no writer';
        const char = previewWriter._character;
        return {
          strokeCount: char ? char.strokes.length : null,
          writerProps: Object.keys(previewWriter),
          charProps: char ? Object.keys(char) : null,
          strokesSummary: char ? char.strokes.map((s, idx) => ({
            idx,
            pathLen: s.path ? s.path.length : null,
            pointsLen: s.points ? s.points.length : null
          })) : null
        };
      })()`,
      returnByValue: true
    });

    console.log('HanziWriter Object info:\n', JSON.stringify(hwObj.result.value, null, 2));

    ws.close();
  } finally {
    chrome.kill();
  }
})();
