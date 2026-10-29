const http = require('http');
const PORT = 9965;
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
                
                const rows = [];
                for (let y = 15; y <= 85; y += 3) {
                    let s = '';
                    for (let x = 30; x <= 90; x += 1) {
                        const px = Math.round(x * R / 100);
                        const py = Math.round(y * R / 100);
                        const pIdx = py * W + px;
                        const idx = g.idx.indexOf(pIdx);
                        s += (idx >= 0 && g.a[idx] > 40) ? '#' : '.';
                    }
                    rows.push({ y, line: s });
                }
                return rows;
            })()`,
            returnByValue: true
        });
        console.log('웨 ASCII map (X=30% to 90%, Y=15% to 85%):');
        res.result.value.forEach(r => console.log(`Y=${r.y.toString().padStart(3)}: ${r.line}`));

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
