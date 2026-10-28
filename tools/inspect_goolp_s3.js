const { spawn } = require('child_process'), http = require('http');
const PORT = 9977;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT, 'about:blank'
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
    await sleep(1500);

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const R = 384;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px Batang, serif';
            ctx.fillText('굺', R / 2, R / 2);
            const d = ctx.getImageData(0, 0, R, R).data;

            // In y in [42%, 52%], find where ink is:
            const cols = [];
            for (let x = 0; x < R; x += 2) {
                let s = 0;
                for (let y = Math.round(R * 0.42); y <= Math.round(R * 0.52); y++) {
                    if (d[(y * R + x) * 4 + 3] > 60) s++;
                }
                if (s > 0) cols.push({ cellX: +(x * 100 / R).toFixed(1), s });
            }
            return JSON.stringify(cols);
        })()`,
        returnByValue: true
    });
    console.log(res.result.value);
    ws.close(); chrome.kill(); process.exit(0);
})();
