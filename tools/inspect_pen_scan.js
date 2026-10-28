const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9997;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_pen_scan_' + PORT, 'about:blank'
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
        Engine.loadText('펜');
        const R = 360;
        const off = document.createElement('canvas');
        off.width = R; off.height = R;
        const ctx = off.getContext('2d');
        const ff = Engine.styleParams.fontFamily;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
        ctx.fillText('펜', R / 2, R / 2);
        const img = ctx.getImageData(0, 0, R, R).data;

        const jb = Engine.dynBounds[0];
        const yStart = Math.round(jb.jongY1 + (jb.maxY - jb.jongY1) * 0.12);
        let jLeft = R, jRight = 0;
        for (let y = yStart; y <= jb.maxY; y++) {
            for (let x = 0; x < R; x++) {
                if (img[(y * R + x) * 4 + 3] > 50) {
                    if (x < jLeft) jLeft = x;
                    if (x > jRight) jRight = x;
                }
            }
        }
        return {
            origJongX: [jb.jongX1, jb.jongX2],
            cleanJongX: [jLeft, jRight],
            origPct: [jb.jongX1 * 100 / R, jb.jongX2 * 100 / R],
            cleanPct: [jLeft * 100 / R, jRight * 100 / R]
        };
    })()`);

    console.log('Pen jong scan comparison:', JSON.stringify(res, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
