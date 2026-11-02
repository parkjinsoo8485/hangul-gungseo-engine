const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9360;
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1600,1000',
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ], { stdio: 'ignore' });

  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      await sleep(300);
      targets = await getJson(`http://127.0.0.1:${PORT}/json`);
      if (targets && targets.length) break;
    }
    if (!targets) throw new Error('No targets found');

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
    await sleep(1500);

    // Cho_T1_ㄱ 상태에서 버튼 클릭
    console.log('Selecting Cho_T1_ㄱ...');
    await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄱ")' });
    await sleep(1000);

    // 붉은 획 애니메이션 실행 상태 캡처
    console.log('Calling playPreviewAnim()...');
    const playRes = await send('Runtime.evaluate', {
      expression: `(() => {
        try {
          playPreviewAnim();
          return { ok: true };
        } catch(e) {
          return { ok: false, err: e.message, stack: e.stack };
        }
      })()`,
      returnByValue: true
    });
    console.log('playPreviewAnim res:', playRes.result.value);

    // 500ms 후 상태 확인
    await sleep(500);
    const stateCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.getElementById('hanzi-preview-box');
        const svg = box ? box.querySelector('svg') : null;
        if (!svg) return 'no svg';
        const allPaths = Array.from(svg.querySelectorAll('path')).map(p => ({
          d_len: p.getAttribute('d') ? p.getAttribute('d').length : 0,
          clipPath: p.getAttribute('clip-path'),
          stroke: p.getAttribute('stroke'),
          fill: p.getAttribute('fill'),
          opacity: p.getAttribute('opacity') || p.style.opacity,
          display: p.style.display,
          strokeDasharray: p.getAttribute('stroke-dasharray') || p.style.strokeDasharray,
          strokeDashoffset: p.getAttribute('stroke-dashoffset') || p.style.strokeDashoffset,
        }));
        return allPaths;
      })()`,
      returnByValue: true
    });
    console.log('SVG paths during animation:\n', JSON.stringify(stateCheck.result.value, null, 2));

    // 다획 자소 Cho_T1_ㄷ도 테스트
    console.log('\nSelecting Cho_T1_ㄷ...');
    await send('Runtime.evaluate', { expression: 'selectPart("Cho_T1_ㄷ")' });
    await sleep(1000);
    console.log('Calling playPreviewAnim() for Cho_T1_ㄷ...');
    await send('Runtime.evaluate', { expression: 'playPreviewAnim()' });
    await sleep(600);
    const stateCheck2 = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.getElementById('hanzi-preview-box');
        const svg = box ? box.querySelector('svg') : null;
        if (!svg) return 'no svg';
        const allPaths = Array.from(svg.querySelectorAll('path')).map(p => ({
          d_len: p.getAttribute('d') ? p.getAttribute('d').length : 0,
          clipPath: p.getAttribute('clip-path'),
          stroke: p.getAttribute('stroke'),
          parentTag: p.parentElement.tagName,
          parentClass: p.parentElement.className,
          parentClip: p.parentElement.getAttribute('clip-path')
        }));
        return allPaths;
      })()`,
      returnByValue: true
    });
    console.log('SVG paths for Cho_T1_ㄷ:\n', JSON.stringify(stateCheck2.result.value, null, 2));

    ws.close();
  } finally {
    chrome.kill();
  }
})();
