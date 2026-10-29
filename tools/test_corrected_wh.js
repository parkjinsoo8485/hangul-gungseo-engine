const http = require('http');
const PORT = 9963;
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
                
                // Fix Jung_T1_ㅙ
                parts['Jung_T1_ㅙ'].m[2] = [ [540, 825], [540, 520], [540, 220] ];
                parts['Jung_T1_ㅙ'].m[3] = [ [540, 520], [610, 520], [680, 520] ];
                parts['Jung_T1_ㅙ'].m[4] = [ [680, 857], [680, 510], [680, 164] ];
                
                // Fix Jung_T2_ㅙ
                parts['Jung_T2_ㅙ'].m[2] = [ [535, 850], [535, 645], [535, 435] ];
                parts['Jung_T2_ㅙ'].m[3] = [ [535, 620], [605, 620], [675, 620] ];
                parts['Jung_T2_ㅙ'].m[4] = [ [675, 875], [675, 650], [675, 425] ];
                
                // Fix Jung_T1_ㅞ
                parts['Jung_T1_ㅞ'].m[2] = [ [435, 420], [490, 420], [550, 420] ];
                parts['Jung_T1_ㅞ'].m[3] = [ [550, 810], [550, 510], [555, 210] ];
                parts['Jung_T1_ㅞ'].m[4] = [ [680, 845], [680, 505], [685, 164] ];
                
                // Fix Jung_T2_ㅞ
                parts['Jung_T2_ㅞ'].m[2] = [ [435, 515], [490, 515], [545, 515] ];
                parts['Jung_T2_ㅞ'].m[3] = [ [545, 845], [545, 635], [545, 425] ];
                parts['Jung_T2_ㅞ'].m[4] = [ [675, 880], [675, 650], [675, 415] ];
                
                window.WH.load(window.HANGUL_WH_CENTERLINES);
                
                const testChars = ['웨', '궤', '궥', '왜', '괘', '괙', '눼', '꿰'];
                const summary = [];
                for (const ch of testChars) {
                    Engine.loadText(ch);
                    const g = Engine.glyphData;
                    const R = g.R, W = g.W;
                    let totalAir = 0;
                    Engine.strokes.forEach((pts, sIdx) => {
                        let air = 0;
                        const step = Math.max(1, Math.floor(pts.length / 6));
                        for (let pi = 1; pi < pts.length - 1; pi += step) {
                            const px = Math.round(pts[pi][0] * R / 100);
                            const py = Math.round(pts[pi][1] * R / 100);
                            const pIdx = py * W + px;
                            const idx = g.idx.indexOf(pIdx);
                            if (idx < 0 || g.a[idx] < 20) air++;
                        }
                        if (air >= 3) totalAir++;
                    });
                    summary.push({ ch, totalAir, strokes: Engine.strokes.length });
                }
                return summary;
            })()`,
            returnByValue: true
        });
        console.log('Test summary with corrected warehouse coordinates:');
        console.table(res.result.value);

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
