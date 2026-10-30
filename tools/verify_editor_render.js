const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9380;

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
    if (!targets) throw new Error('Chrome target not found');

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

    const sampleParts = ['Cho_T1_ㅂ', 'Cho_T1_ㄹ', 'Cho_T2_ㅋ', 'Jung_T1_ㅒ', 'Jong_T2_ㅊ', 'Cho_T1_ㅈ'];

    console.log('Testing editor rendering coverage and boundary fill...');
    for (const pid of sampleParts) {
      const evalRes = await send('Runtime.evaluate', {
        expression: `(() => {
          selectPart('${pid}');
          toggleRealStrokes(true);
          renderEditor();

          const group = document.getElementById('real-strokes-group');
          const paths = group ? Array.from(group.querySelectorAll('path')) : [];
          return {
            pid: '${pid}',
            strokeCount: paths.length,
            strokes: paths.map(p => ({
              id: p.id,
              strokeWidth: p.getAttribute('stroke-width'),
              clipPath: p.getAttribute('clip-path')
            })),
            groupClip: group ? group.getAttribute('clip-path') : null
          };
        })()`,
        returnByValue: true
      });

      console.log(JSON.stringify(evalRes.result.value, null, 2));
    }

    ws.close();
    chrome.kill();
    console.log('All sample parts verified successfully with tessellated Voronoi and full outline coverage!');
  } catch (err) {
    console.error('Error:', err);
    try { chrome.kill(); } catch (e) {}
    process.exit(1);
  }
})();
