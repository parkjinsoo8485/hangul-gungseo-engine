const http = require('http');
const PORT = 9970;
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
                // Test for '궥' with stem1 detection:
                Engine.loadText('궥');
                const g = Engine.glyphData;
                const R = g.R, W = g.W;
                
                // Let's check what xSplit is when scanning before Stem 1:
                // Stem 1 is at 199 (55.3%)
                // Search valley between 35% and 53%:
                let minVal = 1e9, bestX = 170;
                for (let x = Math.round(R * 0.52); x >= Math.round(R * 0.35); x--) {
                    let sum = 0;
                    for (let y = 0; y <= Math.round(R * 0.45); y++) {
                        const pIdx = y * W + x;
                        const idx = g.idx.indexOf(pIdx);
                        if (idx >= 0 && g.a[idx] > 50) sum++;
                    }
                    if (sum < minVal) { minVal = sum; bestX = x; }
                    if (sum === 0) break;
                }
                
                return {
                    bestX,
                    bestXPercent: (bestX * 100 / R).toFixed(1),
                    minVal
                };
            })()`,
            returnByValue: true
        });
        console.log('궥 new xSplit:', JSON.stringify(res.result.value, null, 2));

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
