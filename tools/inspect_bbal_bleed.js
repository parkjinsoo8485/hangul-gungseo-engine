const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9980;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_bbal_' + PORT, 'about:blank'
], { stdio: 'ignore' });
const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    let list;
    for (let i = 0; i < 40; i++) { try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { } await sleep(250); }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r.result); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(3500);

    const evalCode = async (expr) => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
        return r.result.value;
    };

    const res = await evalCode(`(() => {
        try {
            Engine.loadText('빨');
            const R = 360;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d');
            const ff = Engine.styleParams.fontFamily;
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
            ctx.fillText('빨', R / 2, R / 2);
            const img = ctx.getImageData(0, 0, R, R).data;

            const s13 = Engine.strokes[12];
            const endPt = s13[s13.length - 1];
            
            // Sample alpha around endPt
            const endAlphas = [];
            for (let dx = -10; dx <= 10; dx++) {
                const x = (endPt[0] + dx);
                const xPx = Math.round(x * R / 100);
                const yPx = Math.round(endPt[1] * R / 100);
                const a = (xPx >= 0 && xPx < R && yPx >= 0 && yPx < R) ? img[(yPx * R + xPx) * 4 + 3] : 0;
                endAlphas.push({ x: x.toFixed(1), a });
            }

            // Also check all points in stroke 13 and their alpha
            const ptsAlphas = s13.map(p => {
                const xPx = Math.round(p[0] * R / 100);
                const yPx = Math.round(p[1] * R / 100);
                const a = (xPx >= 0 && xPx < R && yPx >= 0 && yPx < R) ? img[(yPx * R + xPx) * 4 + 3] : 0;
                return { x: p[0].toFixed(1), y: p[1].toFixed(1), a };
            });

            const jb = Engine.cachedDynBounds ? Engine.cachedDynBounds[0] : null;

            return {
                s13_len: s13.length,
                endPt,
                endAlphas,
                ptsAlphas: ptsAlphas.slice(-10),
                jb
            };
        } catch (e) {
            return { error: e.message, stack: e.stack };
        }
    })()`);

    console.log('Result for 빨 stroke 13:', JSON.stringify(res, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
