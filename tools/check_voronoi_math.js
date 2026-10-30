const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9369;
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

    await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄷ")' });
    await sleep(1000);

    const testRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const p = currentPartData;
        const v0 = computeStrokeVoronoiPolygon(0, p.medians);
        const v1 = computeStrokeVoronoiPolygon(1, p.medians);

        // 점들이 v0, v1 안에 들어가는지 확인
        const m0_in_v0 = p.medians[0].map(pt => pointInPolygon(pt[0], pt[1], v0));
        const m0_in_v1 = p.medians[0].map(pt => pointInPolygon(pt[0], pt[1], v1));
        const m1_in_v0 = p.medians[1].map(pt => pointInPolygon(pt[0], pt[1], v0));
        const m1_in_v1 = p.medians[1].map(pt => pointInPolygon(pt[0], pt[1], v1));

        return {
          medians0: p.medians[0],
          medians1: p.medians[1],
          v0,
          v1,
          m0_in_v0,
          m0_in_v1,
          m1_in_v0,
          m1_in_v1
        };
      })()`,
      returnByValue: true
    });

    console.log('Voronoi check for Cho_T1_ㄷ:', JSON.stringify(testRes.result.value, null, 2));

    ws.close();
  } finally {
    chrome.kill();
  }
})();
