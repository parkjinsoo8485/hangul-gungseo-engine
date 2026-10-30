const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9346;

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

async function main() {
  const chrome = spawn(CHROME_PATH, [
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
    if (!page) throw new Error('No page found');

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

    await send('Runtime.enable');
    await sleep(1500);

    // Cho_T1_ㄷ을 선택하고 DOM 구조 확인
    await send('Runtime.evaluate', {
      expression: `(() => {
        selectPart('Cho_T1_ㄷ');
      })()`
    });
    await sleep(1000);

    const domInfo = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.getElementById('hanzi-preview-box');
        if (!box) return 'no box';
        const svg = box.querySelector('svg');
        if (!svg) return 'no svg';
        
        const defs = svg.querySelector('defs');
        const clipPaths = defs ? Array.from(defs.querySelectorAll('clipPath')).map(cp => ({
          id: cp.id,
          outerHTML: cp.outerHTML.slice(0, 150)
        })) : [];

        const allPaths = Array.from(svg.querySelectorAll('path')).map(p => ({
          d_len: p.getAttribute('d') ? p.getAttribute('d').length : 0,
          clipPath: p.getAttribute('clip-path'),
          stroke: p.getAttribute('stroke'),
          fill: p.getAttribute('fill'),
          className: p.getAttribute('class'),
          parentTag: p.parentElement ? p.parentElement.tagName : 'none'
        }));

        return { clipPaths, allPaths };
      })()`,
      returnByValue: true
    });

    console.log('HanziWriter SVG DOM Info for Cho_T1_ㄷ:', JSON.stringify(domInfo.result.value, null, 2));

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(e => console.error(e));
