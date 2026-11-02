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
    '--window-size=1600,1000',
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });

  let tabs = null;
  for (let i = 0; i < 40; i++) {
    await sleep(250);
    try {
      const res = await new Promise(r => {
        http.get('http://127.0.0.1:' + PORT + '/json', resp => {
          let d = ''; resp.on('data', c => d += c);
          resp.on('end', () => { try { r(JSON.parse(d)); } catch(e){ r(null); } });
        }).on('error', () => r(null));
      });
      if (Array.isArray(res) && res.length > 0) { tabs = res; break; }
    } catch(e) {}
  }

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
  await send('Page.enable');

  const testParts = ['Cho_T1_ㅈ', 'Cho_T2_ㅈ', 'Cho_T3_ㅈ', 'Jong_T1_ㅈ', 'Jong_T2_ㅈ'];

  for (const partId of testParts) {
    console.log(`\n========================================`);
    console.log(`🎬 Recording Video Frames for [${partId}]...`);
    console.log(`========================================`);

    await send('Runtime.evaluate', { expression: `selectPart("${partId}")` });
    await sleep(400);

    const strokeCount = 3;
    fs.mkdirSync(`tools/frames_${partId}`, { recursive: true });

    // Hide character first
    await send('Runtime.evaluate', { expression: 'previewWriter.hideCharacter({ duration: 0 })' });
    await sleep(100);

    // Frame 0: empty
    let snap = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 814, y: 117, width: 340, height: 340, scale: 1 }
    });
    fs.writeFileSync(`tools/frames_${partId}/frame_init.png`, Buffer.from(snap.data, 'base64'));

    for (let s = 0; s < strokeCount; s++) {
      // Start animating stroke s with standard speed (e.g. speed: 1.0, takes ~400ms)
      // Capture 4 intermediate frames during stroke animation
      send('Runtime.evaluate', {
        expression: `
          previewWriter.animateStroke(${s}, {
            strokeAnimationSpeed: 0.5,
            delayBetweenStrokes: 0
          })
        `
      });

      for (let f = 1; f <= 5; f++) {
        await sleep(100);
        snap = await send('Page.captureScreenshot', {
          format: 'png',
          clip: { x: 814, y: 117, width: 340, height: 340, scale: 1 }
        });
        fs.writeFileSync(`tools/frames_${partId}/stroke_${s}_step_${f}.png`, Buffer.from(snap.data, 'base64'));
      }
      // Wait for stroke animation to fully complete
      await sleep(250);
      snap = await send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 814, y: 117, width: 340, height: 340, scale: 1 }
      });
      fs.writeFileSync(`tools/frames_${partId}/stroke_${s}_final.png`, Buffer.from(snap.data, 'base64'));
      console.log(`Captured stroke ${s} frames.`);
    }
  }

  ws.close();
  chrome.kill();
  console.log('\nAll frames captured successfully!');
})();
