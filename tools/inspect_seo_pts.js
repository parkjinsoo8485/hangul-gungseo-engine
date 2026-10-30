const { spawn } = require('child_process'), http = require('http');
const PORT = 9967;
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
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2000);

    const r = await send('Runtime.evaluate', {
        expression: `(() => {
            Engine.loadText('서');
            const R = 360;
            const ff = Engine.styleParams.fontFamily;
            const cv = document.createElement('canvas'); cv.width = R; cv.height = R;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
            ctx.fillText('서', R / 2, R / 2);
            const img = ctx.getImageData(0, 0, R, R).data;

            const rows = [];
            for (let y = 20; y <= 70; y += 2) {
                const py = Math.round(y * R / 100);
                const xs = [];
                for (let x = 10; x <= 50; x++) {
                    const px = Math.round(x * R / 100);
                    if (img[(py * R + px) * 4 + 3] > 60) xs.push(x);
                }
                if (xs.length) rows.push({ y, xMin: xs[0], xMax: xs[xs.length - 1], midX: +((xs[0] + xs[xs.length - 1])/2).toFixed(1) });
            }
            return JSON.stringify(rows);
        })()`
    });
    console.log(r.result.result.value);
    chrome.kill();
    process.exit(0);
})();
