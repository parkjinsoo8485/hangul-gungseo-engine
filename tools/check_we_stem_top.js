const http = require('http');
const PORT = 9960;
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
                Engine.loadText('웨');
                const g = Engine.glyphData;
                const R = g.R, W = g.W;
                const jb = Engine.dynBounds[0];
                const yBar = jb.yBarC;
                
                // Scan just below yBar: yBar + 3 to yBar + 8
                const cols = [];
                for (let px = Math.round(R * 0.25); px <= Math.round(R * 0.45); px++) {
                    let sum = 0;
                    for (let py = yBar + 3; py <= yBar + 8; py++) {
                        const pIdx = py * W + px;
                        const idx = g.idx.indexOf(pIdx);
                        if (idx >= 0 && g.a[idx] > 50) sum++;
                    }
                    if (sum > 0) cols.push({ px, xPct: (px * 100 / R).toFixed(1), sum });
                }
                return {
                    yBarPct: (yBar * 100 / R).toFixed(1),
                    colsNearBar: cols
                };
            })()`,
            returnByValue: true
        });
        console.log('웨 stem top near yBar:', JSON.stringify(res.result.value, null, 2));

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
