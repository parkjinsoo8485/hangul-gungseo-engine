const http = require('http');
const PORT = 9967;
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
                const p = window.HANGUL_WH_CENTERLINES.parts['Jung_T2_ㅞ'];
                p.m[2] = [ [500, 515], [535, 515], [570, 515] ];
                p.m[3] = [ [565, 845], [570, 635], [570, 425] ];
                p.m[4] = [ [665, 880], [670, 650], [670, 415] ];
                window.WH.load(window.HANGUL_WH_CENTERLINES);
                
                Engine.loadText('궥');
                const g = Engine.glyphData;
                const R = g.R, W = g.W;
                
                // Allow v.fbox[0] to use its warehouse position
                const v = Engine.jamoEntries.find(e => e.subPart === 'jung_v');
                v.fbox[0] = v.def[0];
                v.fbox[2] = v.def[2];
                Engine.rebuildStrokes();
                
                const results = Engine.strokes.map((pts, sIdx) => {
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
                
                return results;
            })()`,
            returnByValue: true
        });
        console.log('궥 with warehouse fbox:');
        console.table(res.result.value);

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
