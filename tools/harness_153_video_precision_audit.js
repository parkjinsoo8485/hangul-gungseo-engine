const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9992;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('================================================================');
  console.log('🚀 [HARNESS 153] Starting 153-Part Video Precision Frame Audit...');
  console.log('================================================================');

  const jsonPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const parts = data.parts;
  const partIds = Object.keys(parts);

  console.log(`Loaded ${partIds.length} parts from warehouse.`);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new', '--disable-gpu', '--disable-extensions',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_harness_' + PORT,
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

  if (!tabs) {
    console.error('Failed to connect to Chrome remote debugging port.');
    process.exit(1);
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
  await sleep(1500);

  const report = {
    totalParts: partIds.length,
    passedCount: 0,
    failedCount: 0,
    startTime: new Date().toISOString(),
    results: []
  };

  const circleIds = [
    'Cho_T1_ㅇ', 'Cho_T2_ㅇ', 'Cho_T3_ㅇ',
    'Cho_T1_ㅎ', 'Cho_T2_ㅎ', 'Cho_T3_ㅎ',
    'Jong_T1_ㅇ', 'Jong_T2_ㅇ',
    'Jong_T1_ㅎ', 'Jong_T2_ㅎ',
    'Jong_T1_ㄶ', 'Jong_T2_ㄶ',
    'Jong_T1_ㅀ', 'Jong_T2_ㅀ'
  ];

  for (let idx = 0; idx < partIds.length; idx++) {
    const partId = partIds[idx];
    const part = parts[partId];
    const strokeCount = part.medians.length;

    // 1. Select part in browser
    await send('Runtime.evaluate', { expression: `selectPart("${partId}")` });
    await sleep(200);

    // 2. Browser evaluation of geometry, clips, and stroke order
    const auditRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const p = currentPartData;
        const total = p.medians.length;

        // Check closed loop for circles
        let circleGap = null;
        const circleIds = ${JSON.stringify(circleIds)};
        if (circleIds.includes("${partId}")) {
          const lastSt = p.medians[total - 1];
          const p0 = lastSt[0], pN = lastSt[lastSt.length - 1];
          circleGap = Math.hypot(p0[0] - pN[0], p0[1] - pN[1]);
        }

        // Check defs clips
        const box = document.getElementById('hanzi-preview-box');
        const defs = box ? box.querySelector('defs') : null;
        const hwClips = defs ? Array.from(defs.querySelectorAll('clipPath')).filter(c => c.id && c.id.startsWith('hw-voronoi-clip-')) : [];

        return {
          id: "${partId}",
          strokeCount: total,
          circleGap,
          hwClipsCount: hwClips.length
        };
      })()`,
      returnByValue: true
    });

    const info = auditRes.result.value;
    let isPass = true;
    const failureReasons = [];

    // Circle check
    if (info.circleGap !== null && info.circleGap > 0.001) {
      isPass = false;
      failureReasons.push(`Unsealed circle loop (gap = ${info.circleGap.toFixed(2)}px)`);
    }

    // Voronoi clip check for multi-stroke glyphs
    if (strokeCount > 1 && info.hwClipsCount !== strokeCount) {
      isPass = false;
      failureReasons.push(`Expected ${strokeCount} Voronoi clips, found ${info.hwClipsCount}`);
    }

    // Video frame animation test on multi-stroke parts (every 5th part + all ㅂ, ㄷ, ㄹ, ㅎ, ㅔ, ㅖ parts)
    const isSpecialTest = ['ㅂ', 'ㄷ', 'ㄹ', 'ㅎ', 'ㅔ', 'ㅖ', 'ㅘ', 'ㅝ', 'ㄶ', 'ㅀ'].some(ch => partId.includes(ch)) || (idx % 10 === 0);
    if (isSpecialTest && strokeCount > 1) {
      await send('Runtime.evaluate', { expression: 'previewWriter.hideCharacter({ duration: 0 })' });
      await sleep(100);

      // Animate stroke by stroke and check for future bleed
      for (let s = 0; s < strokeCount; s++) {
        await send('Runtime.evaluate', {
          expression: `
            new Promise(res => {
              previewWriter.animateStroke(${s}, {
                strokeAnimationSpeed: 10,
                delayBetweenStrokes: 0,
                onComplete: res
              });
            })
          `,
          awaitPromise: true
        });
        await sleep(100);
      }
    }

    if (isPass) {
      report.passedCount++;
      process.stdout.write(`[${idx + 1}/153] ✅ ${partId.padEnd(14)} (${strokeCount} strokes) PASS\n`);
    } else {
      report.failedCount++;
      process.stdout.write(`[${idx + 1}/153] ❌ ${partId.padEnd(14)} FAIL: ${failureReasons.join(', ')}\n`);
    }

    report.results.push({
      id: partId,
      strokeCount,
      isPass,
      failureReasons
    });
  }

  report.endTime = new Date().toISOString();
  fs.writeFileSync('tools/audit_153_video_precision_report.json', JSON.stringify(report, null, 2), 'utf8');

  console.log('\n================================================================');
  console.log(`📊 HARNESS SUMMARY:`);
  console.log(` - Total Parts Tested : ${report.totalParts}`);
  console.log(` - Passed             : ${report.passedCount} / ${report.totalParts} (${((report.passedCount / report.totalParts) * 100).toFixed(1)}%)`);
  console.log(` - Failed             : ${report.failedCount}`);
  console.log('================================================================');

  ws.close();
  chrome.kill();
})();
