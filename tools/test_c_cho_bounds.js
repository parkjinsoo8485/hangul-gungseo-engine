const { spawn } = require('child_process'), http = require('http');
const PORT = 9970;
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

            const testCh = (ch) => {
                ctx.clearRect(0, 0, R, R);
                ctx.fillText(ch, R / 2, R / 2);
                const d = ctx.getImageData(0, 0, R, R).data;
                const info = decomposeHangul(ch);
                const b = computeDynamicJamoBounds(d, 0, 1, R, info, 'C', false);
                let choLeft = R, choRight = 0;
                for (let y = b.choY1; y <= b.choY2; y++) {
                    for (let x = b.minX; x <= b.splitX - 2; x++) {
                        if (d[(y * R + x) * 4 + 3] > 50) {
                            if (x < choLeft) choLeft = x;
                            if (x > choRight) choRight = x;
                        }
                    }
                }
                return {
                    ch,
                    splitX: +(b.splitX * 100 / R).toFixed(1),
                    choY1: +(b.choY1 * 100 / R).toFixed(1),
                    choY2: +(b.choY2 * 100 / R).toFixed(1),
                    choX1: +(choLeft * 100 / R).toFixed(1),
                    choX2: +(choRight * 100 / R).toFixed(1),
                    choW: +((choRight - choLeft) * 100 / R).toFixed(1),
                    choMidX: +(((choLeft + choRight) * 0.5) * 100 / R).toFixed(1)
                };
            };
            return JSON.stringify(['회', '의', '화', '와', '위'].map(testCh));
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
