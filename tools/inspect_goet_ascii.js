const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9990;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_goet_' + PORT, 'about:blank'
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
        Engine.loadText('굍');
        const R = 360, s = R / 100;
        const off = document.createElement('canvas');
        off.width = R; off.height = R;
        const ctx = off.getContext('2d');
        const ff = Engine.styleParams.fontFamily;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
        ctx.fillText('굍', R / 2, R / 2);
        const img = ctx.getImageData(0, 0, R, R).data;

        // Print ASCII grid for y between 60% and 90%, x between 30% and 80%
        const y1 = Math.round(R * 0.65), y2 = Math.round(R * 0.90);
        const x1 = Math.round(R * 0.30), x2 = Math.round(R * 0.80);
        const lines = [];
        for (let y = y1; y <= y2; y += 4) {
            let row = y + ' (' + Math.round(y * 100 / R) + '%): ';
            for (let x = x1; x <= x2; x += 4) {
                const a = img[(y * R + x) * 4 + 3];
                row += a > 50 ? '#' : '.';
            }
            lines.push(row);
        }
        return { grid: lines };
    })()`);

    console.log(res.grid.join('\n'));
    ws.close(); chrome.kill(); process.exit(0);
})();
