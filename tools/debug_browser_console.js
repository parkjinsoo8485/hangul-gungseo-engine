const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9352;
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
    await send('Console.enable');

    ws.addEventListener('message', (evt) => {
      const d = JSON.parse(evt.data);
      if (d.method === 'Console.messageAdded') {
        console.log('BROWSER LOG:', d.params.message.text);
      }
      if (d.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE API:', d.params.args.map(a => a.value || a.description).join(' '));
      }
    });

    await send('Runtime.evaluate', {
      expression: `(() => {
        console.log('Triggering selectPart for Cho_T1_ㄷ');
        selectPart('Cho_T1_ㄷ');
      })()`
    });
    await sleep(1500);

    const testExec = await send('Runtime.evaluate', {
      expression: `(() => {
        console.log('Manual call to applyHanziChainedVoronoi:');
        applyHanziChainedVoronoi();
        const box = document.getElementById('hanzi-preview-box');
        const svg = box.querySelector('svg');
        const defs = svg.querySelector('defs');
        const clips = Array.from(defs.querySelectorAll('clipPath')).filter(cp => cp.id && cp.id.startsWith('mask-'));
        return clips.map(c => ({ id: c.id, cp: c.getAttribute('clip-path') }));
      })()`,
      returnByValue: true
    });

    console.log('Manual Exec Result:', JSON.stringify(testExec.result.value, null, 2));

    ws.close();
  } finally {
    chrome.kill();
  }
})();
