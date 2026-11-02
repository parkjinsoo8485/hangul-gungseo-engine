const http = require('http');
const PORT = 9956;
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    try {
        let list;
        for (let i = 0; i < 40; i++) {
            try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) { }
            await sleep(250);
        }
        const wsUrl = list.find(t => t.type === 'page').webSocketDebuggerUrl;
        const ws = new WebSocket(wsUrl);
        let id = 1;
        const send = (m, p = {}) => new Promise((res, rej) => {
            const reqId = id++;
            const onMsg = ({ data }) => {
                const r = JSON.parse(data);
                if (r.id === reqId) { ws.removeEventListener('message', onMsg); if (r.error) rej(r.error); else res(r.result); }
            };
            ws.addEventListener('message', onMsg);
            ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
        });
        await new Promise(r => ws.onopen = r);

        await send('Page.enable');
        await send('Network.setCacheDisabled', { cacheDisabled: true });
        await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
        
        for (let i = 0; i < 40; i++) {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
            await sleep(250);
        }

        const res = await send('Runtime.evaluate', {
            expression: `(() => {
                const parts = window.HANGUL_WH_CENTERLINES.parts;
                parts['Jung_T1_ㅞ'].m[2] = [ [435, 420], [490, 420], [550, 420] ];
                parts['Jung_T1_ㅞ'].m[3] = [ [550, 810], [550, 510], [555, 210] ];
                parts['Jung_T1_ㅞ'].m[4] = [ [680, 845], [680, 505], [685, 164] ];
                window.WH.load(window.HANGUL_WH_CENTERLINES);
                
                Engine.loadText('웨');
                const g = Engine.glyphData;
                const R = g.R, W = g.W;
                
                // Override stemX_U with peakCols midpoint
                const jb = Engine.dynBounds[0];
                jb.stemX_U = 122; // 33.9%
                Engine.rebuildStrokes();
                
                return Engine.strokes.map((pts, sIdx) => {
                    let air = 0;
                    const step = Math.max(1, Math.floor(pts.length / 6));
                    for (let pi = 1; pi < pts.length - 1; pi += step) {
                        const px = Math.round(pts[pi][0] * R / 100);
                        const py = Math.round(pts[pi][1] * R / 100);
                        const pIdx = py * W + px;
                        const idx = g.idx.indexOf(pIdx);
                        if (idx < 0 || g.a[idx] < 20) air++;
                    }
                    return {
                        sIdx: sIdx + 1,
                        whId: Engine.strokeMeta[sIdx].whId,
                        air,
                        total: pts.length,
                        first: pts[0],
                        last: pts[pts.length - 1]
                    };
                });
            })()`,
            returnByValue: true
        });
        console.log('웨 strokes with peakCols stemX_U:');
        console.table(res.result.value);

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
