const { spawn } = require('child_process'), http = require('http');
const PORT = 9984;
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
            const R = 150, s = R / 100;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const ff = Engine.styleParams.fontFamily;
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
            ctx.fillText('굺', R / 2, R / 2);
            const d = ctx.getImageData(0, 0, R, R).data;

            Engine.loadText('굺');

            // Find stemX_U in y in [45%, 53%]
            let maxCol = -1, bestX = 75;
            for (let x = Math.round(R * 0.45); x <= Math.round(R * 0.75); x++) {
                let sum = 0;
                for (let y = Math.round(R * 0.46); y <= Math.round(R * 0.53); y++) {
                    if (d[(y * R + x) * 4 + 3] > 50) sum++;
                }
                if (sum > maxCol) { maxCol = sum; bestX = x; }
            }
            const actTickX = +(bestX / s).toFixed(1);

            // Shift stroke 3 to actTickX
            const s3 = Engine.strokes[2];
            const dx = actTickX - s3[0][0];
            s3.forEach(p => p[0] += dx);

            const ptHit = (p, maxD) => {
                const px = Math.round(p[0] * s), py = Math.round(p[1] * s);
                for (let dy = -maxD; dy <= maxD; dy++) {
                    for (let dx = -maxD; dx <= maxD; dx++) {
                        const x = px + dx, y = py + dy;
                        if (x >= 0 && x < R && y >= 0 && y < R && d[(y * R + x) * 4 + 3] > 50) return true;
                    }
                }
                return false;
            };

            const hit = s3.filter(p => ptHit(p, 3)).length;
            return JSON.stringify({
                actTickX,
                dx,
                hit,
                len: s3.length,
                ratio: +(hit * 100 / s3.length).toFixed(1)
            });
        })()`,
        returnByValue: true
    });
    console.log(res.result.value);
    ws.close(); chrome.kill(); process.exit(0);
})();
