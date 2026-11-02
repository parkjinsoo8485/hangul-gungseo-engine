const { spawn } = require('child_process');
const http = require('http');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9490',
  '--headless=new',
  '--disable-gpu',
  'http://localhost:8000/view_150_warehouse_gallery.html'
], { stdio: 'ignore' });

setTimeout(async () => {
  const tabs = await new Promise(r => {
    http.get('http://127.0.0.1:9490/json', resp => {
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

        // Get snapshot of paths before animation
        const svg = document.querySelector("#hanzi-preview-box svg");
        const getPathsState = () => Array.from(svg.querySelectorAll('path')).map(p => ({
          d: (p.getAttribute('d')||'').slice(0, 25),
          clip: p.getAttribute('clip-path') || p.parentNode?.getAttribute('clip-path'),
          dashoffset: p.style.strokeDashoffset,
          opacity: p.style.opacity,
          display: p.style.display,
          parentClass: p.parentNode?.getAttribute('class')
        }));

        const before = getPathsState();

        await previewWriter.hideCharacter({ duration: 0 });
        const afterHide = getPathsState();

        // Animate stroke 0
        previewWriter.animateStroke(0, { strokeAnimationSpeed: 10.0 });
        await new Promise(r => setTimeout(r, 50));
        const duringS0 = getPathsState();

        return { before, afterHide, duringS0 };
      })()`,
      awaitPromise: true,
      returnByValue: true
    }
  }));

  ws.onmessage = evt => {
    const d = JSON.parse(evt.data);
    if (d.id === 1) {
      console.log('Animation state transitions:\n', JSON.stringify(d.result.result.value, null, 2));
      ws.close();
      chrome.kill();
      process.exit(0);
    }
  };
}, 1500);
