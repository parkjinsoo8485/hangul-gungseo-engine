const { spawn } = require('child_process');
const http = require('http');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9493',
  '--headless=new',
  '--disable-gpu',
  'http://localhost:8000/view_150_warehouse_gallery.html'
], { stdio: 'ignore' });

setTimeout(async () => {
  const tabs = await new Promise(r => {
    http.get('http://127.0.0.1:9493/json', resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => r(JSON.parse(d)));
    });
  });
  const page = tabs.find(t => t.type === 'page' && t.url.includes('view_150'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  ws.addEventListener('message', evt => {
    const d = JSON.parse(evt.data);
    if (d.method === 'Runtime.consoleAPICalled') {
      console.log('CONSOLE:', d.params.type, d.params.args.map(a => a.value || JSON.stringify(a)).join(' '));
    }
    if (d.method === 'Runtime.exceptionThrown') {
      console.error('EXCEPTION:', JSON.stringify(d.params.exceptionDetails));
    }
  });

  let id = 1;
  function send(method, params={}) {
    return new Promise((resolve, reject) => {
      const curId = id++;
      const l = evt => {
        const d = JSON.parse(evt.data);
        if (d.id === curId) {
          ws.removeEventListener('message', l);
          if (d.error) reject(d.error);
          else resolve(d.result);
        }
      };
      ws.addEventListener('message', l);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await new Promise(r => setTimeout(r, 1500));

  await send('Runtime.evaluate', {
    expression: `(async () => {
      selectPart("Cho_T1_ㅂ");
      await new Promise(r => setTimeout(r, 600));

      console.log('Testing raw animateCharacter WITHOUT any wrappers or Voronoi...');
      
      // Reset
      await previewWriter.hideCharacter({ duration: 0 });
      console.log('Character hidden. Now calling animateCharacter...');

      previewWriter.animateCharacter({
        strokeAnimationSpeed: 1.0,
        delayBetweenStrokes: 100,
        onComplete: (res) => {
          console.log('RAW animateCharacter onComplete:', JSON.stringify(res));
        }
      });
    })()`
  });

  // Wait 4 seconds and see console
  await new Promise(r => setTimeout(r, 4000));

  ws.close();
  chrome.kill();
}, 1500);
