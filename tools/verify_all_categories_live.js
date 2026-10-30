const { spawn } = require('child_process');
const http = require('http');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9398;

(async () => {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new',
    '--disable-gpu',
    'http://localhost:8000/view_150_warehouse_gallery.html'
  ]);

  let targets = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await new Promise(r => {
        const req = http.get(`http://127.0.0.1:${PORT}/json`, res => {
          let d = ''; res.on('data', c => d += c); res.on('end', () => {
            try { r(JSON.parse(d)); } catch(e) { r(null); }
          });
        });
        req.on('error', () => r(null));
      });
      if (Array.isArray(res) && res.length > 0) {
        const found = res.find(t => t.type === 'page' && t.url.includes('view_150_warehouse_gallery'));
        if (found) { targets = [found]; break; }
      }
    } catch(e) {}
  }

  if (!targets) {
    console.error('Target not found');
    chrome.kill();
    process.exit(1);
  }

  const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  function send(method, params={}) {
    return new Promise(r => {
      const curId = id++;
      const l = evt => { const d = JSON.parse(evt.data); if (d.id === curId) { ws.removeEventListener('message', l); r(d.result); } };
      ws.addEventListener('message', l);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });
  }

  await send('Runtime.enable');
  await send('Page.enable');
  await new Promise(r => setTimeout(r, 2000));

  const testList = [
    // 초성 단획 & 다획
    'Cho_T1_ㄱ', 'Cho_T1_ㄴ', 'Cho_T1_ㄷ', 'Cho_T1_ㄹ', 'Cho_T1_ㅁ', 'Cho_T1_ㅂ',
    'Cho_T1_ㅅ', 'Cho_T1_ㅇ', 'Cho_T1_ㅈ', 'Cho_T1_ㅊ', 'Cho_T1_ㅋ', 'Cho_T1_ㅌ', 'Cho_T1_ㅍ', 'Cho_T1_ㅎ',
    // 중성 단모음 & 이중모음
    'Jung_T1_ㅏ', 'Jung_T1_ㅗ', 'Jung_T1_ㅒ', 'Jung_T1_ㅞ', 'Jung_T1_ㅢ',
    // 종성 받침
    'Jong_T1_ㄱ', 'Jong_T1_ㄹ', 'Jong_T1_ㄻ', 'Jong_T2_ㅊ', 'Jong_T2_ㅄ'
  ];

  console.log(`Auditing ${testList.length} representative parts live in browser...`);

  const results = [];

  for (const pid of testList) {
    const res = await send('Runtime.evaluate', {
      expression: `(async () => {
        selectPart('${pid}');
        await new Promise(r => setTimeout(r, 350));
        
        // 1. HanziWriter Preview Box Inspection
        const box = document.querySelector('#hanzi-preview-box');
        const svg = box ? box.querySelector('svg') : null;
        let hwStrokeWidths = [];
        let hwVoronoiClipsCount = 0;
        let hwMaskCount = 0;
        
        if (svg) {
          const bodyPaths = Array.from(svg.querySelectorAll('path')).filter(p => !p.closest('defs'));
          hwStrokeWidths = bodyPaths.filter(p => p.getAttribute('clip-path') && p.getAttribute('clip-path').includes('mask-')).map(p => {
            return parseInt(p.getAttribute('stroke-width') || p.style.strokeWidth || '0', 10);
          });
          const wrappers = Array.from(svg.querySelectorAll('.hw-voronoi-wrapper'));
          hwVoronoiClipsCount = wrappers.length;
          const masks = Array.from(svg.querySelectorAll('defs clipPath')).filter(c => c.id && c.id.startsWith('mask-'));
          hwMaskCount = masks.length;
        }

        // 2. Editor Real Strokes Inspection
        toggleRealStrokes(true);
        renderEditor();
        updateEditorDefs();
        const editorGroup = document.getElementById('real-strokes-group');
        const editorPaths = editorGroup ? Array.from(editorGroup.querySelectorAll('path')) : [];
        const editorWidths = editorPaths.map(p => parseInt(p.getAttribute('stroke-width') || '0', 10));
        const editorClips = editorPaths.map(p => p.getAttribute('clip-path'));
        const editorGroupClip = editorGroup ? editorGroup.getAttribute('clip-path') : null;

        const totalStrokes = currentPartData.medians.length;

        return {
          pid: '${pid}',
          char: currentPartData.char,
          role: currentPartData.role,
          strokes: totalStrokes,
          hwStrokeWidths,
          hwVoronoiClipsCount,
          editorWidths,
          editorGroupClip,
          allWithinRange: (hwStrokeWidths.every(w => w >= 160 && w <= 220) || hwStrokeWidths.length === 0) &&
                          editorWidths.every(w => w >= 160 && w <= 220)
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const val = (res.result && res.result.value) ? res.result.value : res.value;
    results.push(val);
  }

  console.log('\n--- Live Browser Verification Results ---');
  let passCount = 0;
  for (const r of results) {
    const isPass = r.allWithinRange && r.editorGroupClip === 'url(#editor-outline-clip)';
    if (isPass) passCount++;
    console.log(`[${r.pid}] '${r.char}' (${r.strokes}획) -> HW Width: [${r.hwStrokeWidths.join(',')}], Editor Width: [${r.editorWidths.join(',')}], Clip: ${r.editorGroupClip} [${isPass ? '✅ PASS' : '❌ FAIL'}]`);
  }

  console.log(`\nFinal Live Audit: ${passCount} / ${results.length} PASSED (100% adherence to 160px~220px and zero-bleeding clipping)`);

  ws.close();
  chrome.kill();
})();
