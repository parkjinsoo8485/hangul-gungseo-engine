const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9370;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise(resolve => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
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
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let msgId = 1;
    const callbacks = new Map();
    const frameEvents = [];

    ws.onmessage = evt => {
      const d = JSON.parse(evt.data);
      if (d.id && callbacks.has(d.id)) {
        const cb = callbacks.get(d.id);
        callbacks.delete(d.id);
        cb(d.result);
      }
      if (d.method === 'Page.screencastFrame') {
        frameEvents.push(d.params);
        // acknowledge frame
        ws.send(JSON.stringify({
          id: msgId++,
          method: 'Page.screencastFrameAck',
          params: { sessionId: d.params.sessionId }
        }));
      }
    };

    function send(method, params = {}) {
      return new Promise(resolve => {
        const id = msgId++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(2000);

    // Select Cho_T1_ㄷ
    await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄷ")' });
    await sleep(500);

    // Start screencast
    console.log('Starting screencast...');
    await send('Page.startScreencast', {
      format: 'jpeg',
      quality: 80,
      maxWidth: 800,
      maxHeight: 600,
      everyNthFrame: 1
    });

    // Play animation
    console.log('Playing preview animation...');
    await send('Runtime.evaluate', { expression: 'playPreviewAnim()' });

    // Record frames for 2.5 seconds
    await sleep(2500);

    await send('Page.stopScreencast');
    console.log(`Recorded total screencast frames: ${frameEvents.length}`);

    ws.close();
  } finally {
    chrome.kill();
  }
})();
