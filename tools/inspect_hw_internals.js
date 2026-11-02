const { spawn } = require('child_process');
const http = require('http');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9485',
  '--headless=new',
  '--disable-gpu',
  'http://localhost:8000/view_150_warehouse_gallery.html'
], { stdio: 'ignore' });

setTimeout(async () => {
  const tabs = await new Promise(r => {
    http.get('http://127.0.0.1:9485/json', resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => r(JSON.parse(d)));
    });
  });
  const page = tabs.find(t => t.type === 'page' && t.url.includes('view_150'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(async () => {
        selectPart("Cho_T1_ㅂ");
        await new Promise(r => setTimeout(r, 600));

        // Inspect HanziWriter renderer structure
        const r = previewWriter._renderer;
        const char = previewWriter._character;
        return {
          rendererKeys: Object.keys(r),
          charStrokes: char.strokes.length,
          stroke0: {
            path: char.strokes[0].path,
            points: char.strokes[0].points
          }
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    }
  }));

  ws.onmessage = evt => {
    const d = JSON.parse(evt.data);
    if (d.id === 1) {
      console.log('HanziWriter internals:\n', JSON.stringify(d.result.result.value, null, 2));
      ws.close();
      chrome.kill();
      process.exit(0);
    }
  };
}, 1500);
