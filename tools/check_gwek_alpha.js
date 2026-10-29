const http = require('http');
const PORT = 9983;
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
                Engine.loadText('궥');
                const pts = Engine.strokes[3]; // stroke 4
                const R = Engine.canvasResolution || 150;
                const W = R;
                const img = Engine.pixelBuffer;
                return pts.map((p, idx) => {
                    const x = Math.round(p[0] * R / 100);
                    const y = Math.round(p[1] * R / 100);
                    const a = img[(y * W + x) * 4 + 3];
                    return { idx, pt: [p[0], p[1]], canvasPt: [x, y], alpha: a };
                });
            })()`,
            returnByValue: true
        });
        console.log('궥 stroke 4 points alpha:');
        console.table(res.result.value);

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
