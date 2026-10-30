const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9345;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const proc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1600,1000',
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });

  try {
    let targets = null;
    for (let i = 0; i < 20; i++) {
      await sleep(400);
      try {
        targets = await getJson(`http://127.0.0.1:${PORT}/json`);
        if (targets && targets.length) break;
      } catch (e) {}
    }
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let msgId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const listener = (evt) => {
          const d = JSON.parse(evt.data);
          if (d.id === id) {
            ws.removeEventListener('message', listener);
            if (d.error) reject(d.error);
            else resolve(d.result);
          }
        };
        ws.addEventListener('message', listener);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sleep(1500);

    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        localStorage.removeItem('hangul_150_custom_medians');
        const db = window.HANGUL_150_WAREHOUSE;
        const keys = Object.keys(db.parts);
        let totalPts = 0, outPts = 0;
        const badParts = [];
        for (const k of keys) {
          const p = db.parts[k];
          const outlinePolys = parseSVGPathToPolygon(p.gungsuhOutline || '');
          let partOutOutline = 0, partOutStrokePoly = 0;
          for (let si = 0; si < p.medians.length; si++) {
            let strokePolys = outlinePolys;
            if (p.strokes && p.strokes[si]) {
              const sp = parseSVGPathToPolygon(p.strokes[si]);
              if (sp.length > 0) strokePolys = sp;
            }
            for (let pi = 0; pi < p.medians[si].length; pi++) {
              totalPts++;
              const [x, y] = p.medians[si][pi];
              if (!isPointInsideStroke(x, y, outlinePolys)) {
                outPts++;
                partOutOutline++;
              }
              if (!isPointInsideStroke(x, y, strokePolys)) {
                partOutStrokePoly++;
              }
            }
          }
          if (partOutOutline > 0 || partOutStrokePoly > 0) badParts.push({ k, partOutOutline, partOutStrokePoly });
        }
        return {
          version: db.meta && db.meta.calibrationVersion,
          partCount: keys.length,
          totalPts,
          outPts,
          badParts
        };
      })()`,
      returnByValue: true
    });

    console.log('Gallery 8000 Audit:', JSON.stringify(evalRes, null, 2));
    ws.close();
  } finally {
    proc.kill();
  }
})();
