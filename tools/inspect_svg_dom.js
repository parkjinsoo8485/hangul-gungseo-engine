const { spawn } = require('child_process');
const http = require('http');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9483',
  '--headless=new',
  '--disable-gpu',
  'http://localhost:8000/view_150_warehouse_gallery.html'
], { stdio: 'ignore' });

setTimeout(async () => {
  const tabs = await new Promise(r => {
    http.get('http://127.0.0.1:9483/json', resp => {
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
        const svg = document.querySelector("#hanzi-preview-box svg");
        const clips = Array.from(svg.querySelectorAll('clipPath[id^="hw-voronoi"]'));
        return clips.map(cp => {
          const p = cp.querySelector('polygon, path');
          if (!p) return { id: cp.id, bbox: null };
          const b = p.getBBox();
          return { id: cp.id, bbox: { x: b.x, y: b.y, w: b.width, h: b.height } };
        });
      })()`,
      awaitPromise: true,
      returnByValue: true
    }
  }));

  ws.onmessage = evt => {
    const d = JSON.parse(evt.data);
    if (d.id === 1) {
      console.log('SVG structure:\n', JSON.stringify(d.result.result.value, null, 2));
      ws.close();
      chrome.kill();
      process.exit(0);
    }
  };
}, 1500);
