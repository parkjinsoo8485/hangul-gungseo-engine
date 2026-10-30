const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9993;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--disable-gpu', '--disable-extensions',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_j_' + PORT,
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });
  await sleep(1500);
  const tabs = await new Promise(r => {
    http.get('http://127.0.0.1:' + PORT + '/json', resp => {
      let d = ''; resp.on('data', c => d += c);
      resp.on('end', () => r(JSON.parse(d)));
    });
  });
  const page = tabs.find(t => t.type === 'page' && t.url.includes('view_150'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    const l = evt => {
      const d = JSON.parse(evt.data);
      if (d.id === curId) {
        ws.removeEventListener('message', l);
        if (d.error) reject(d.error); else resolve(d.result);
      }
    };
    ws.addEventListener('message', l);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await send('Runtime.enable');
  await send('Runtime.evaluate', { expression: `selectPart("Cho_T1_ㅈ")` });
  await sleep(1000);
  await send('Runtime.evaluate', { expression: 'previewWriter.hideCharacter({ duration: 0 })' });
  await sleep(300);

  // Animate stroke 0
  console.log('Animating s0...');
  await send('Runtime.evaluate', {
    expression: 'previewWriter.animateStroke(0, { strokeAnimationSpeed: 1, delayBetweenStrokes: 0 })',
    awaitPromise: true
  });
  await sleep(400);

  let snap0 = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 814, y: 117, width: 340, height: 340, scale: 1 }
  });
  fs.writeFileSync('tools/t1_j_s0.png', Buffer.from(snap0.data, 'base64'));

  // Animate stroke 1
  console.log('Animating s1...');
  await send('Runtime.evaluate', {
    expression: 'previewWriter.animateStroke(1, { strokeAnimationSpeed: 1, delayBetweenStrokes: 0 })',
    awaitPromise: true
  });
  await sleep(400);

  let snap1 = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 814, y: 117, width: 340, height: 340, scale: 1 }
  });
  fs.writeFileSync('tools/t1_j_s1.png', Buffer.from(snap1.data, 'base64'));

  // Animate stroke 2
  console.log('Animating s2...');
  await send('Runtime.evaluate', {
    expression: 'previewWriter.animateStroke(2, { strokeAnimationSpeed: 1, delayBetweenStrokes: 0 })',
    awaitPromise: true
  });
  await sleep(400);

  let snap2 = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 814, y: 117, width: 340, height: 340, scale: 1 }
  });
  fs.writeFileSync('tools/t1_j_s2.png', Buffer.from(snap2.data, 'base64'));

  console.log('Done capturing Cho_T1_ㅈ sequential snaps');

  ws.close();
  chrome.kill();
})();
