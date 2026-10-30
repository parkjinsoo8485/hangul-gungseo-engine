const { spawn } = require('child_process');
const http = require('http');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9482',
  '--headless=new',
  '--disable-gpu',
  'http://localhost:8000/view_150_warehouse_gallery.html'
], { stdio: 'ignore' });

setTimeout(async () => {
  const tabs = await new Promise(r => {
    http.get('http://127.0.0.1:9482/json', resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => r(JSON.parse(d)));
    });
  });
  const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: '(() => { selectPart("Cho_T1_ㅂ"); return computeTessellatedVoronoiCells(currentPartData.medians, currentPartData.gungsuhOutline); })()',
      returnByValue: true
    }
  }));

  ws.onmessage = evt => {
    const d = JSON.parse(evt.data);
    if (d.id === 1) {
      console.log('Result from CDP:', JSON.stringify(d, null, 2));
      ws.close();
      chrome.kill();
      process.exit(0);
    }
  };
}, 1500);
