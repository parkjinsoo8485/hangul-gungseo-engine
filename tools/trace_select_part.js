const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9367;
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
    await send('Console.enable');
    ws.addEventListener('message', (evt) => {
      const d = JSON.parse(evt.data);
      if (d.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', d.params.args.map(a => a.value || a.description).join(' '));
      }
    });

    console.log('--- Initial State ---');
    const initInfo = await send('Runtime.evaluate', {
      expression: '({ selected: selectedPartId, char: currentPartData ? currentPartData.char : null, medians: currentPartData ? currentPartData.medians.length : 0 })',
      returnByValue: true
    });
    console.log(initInfo.result.value);

    console.log('--- Calling selectPart("Cho_T1_ㄷ") ---');
    const selRes = await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄷ")' });
    console.log('selRes:', JSON.stringify(selRes, null, 2));
    await sleep(1500);

    const postInfo = await send('Runtime.evaluate', {
      expression: '({ selected: selectedPartId, char: currentPartData ? currentPartData.char : null, medians: currentPartData ? currentPartData.medians.length : 0 })',
      returnByValue: true
    });
    console.log(postInfo.result.value);

    const hwInfo = await send('Runtime.evaluate', {
      expression: '({ char: previewWriter._char, strokes: previewWriter._character ? previewWriter._character.strokes.length : null })',
      returnByValue: true
    });
    console.log('HW info:', hwInfo.result.value);

    ws.close();
  } finally {
    chrome.kill();
  }
})();
