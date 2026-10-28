const { spawn } = require('child_process'), http = require('http');
const PORT = 9975;
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

            const testDist = (ch, maxD) => {
                Engine.loadText(ch);
                ctx.clearRect(0, 0, R, R);
                ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + Engine.styleParams.fontFamily;
                ctx.fillText(ch, R / 2, R / 2);
                const d = ctx.getImageData(0, 0, R, R).data;

                const ptHit = p => {
                    const px = Math.round(p[0] * s), py = Math.round(p[1] * s);
                    for (let dy = -maxD; dy <= maxD; dy++) {
                        for (let dx = -maxD; dx <= maxD; dx++) {
                            const x = px + dx, y = py + dy;
                            if (x >= 0 && x < R && y >= 0 && y < R && d[(y * R + x) * 4 + 3] > 50) return true;
                        }
                    }
                    return false;
                };

                return Engine.strokes.map((pts, i) => {
                    let hit = 0;
                    pts.forEach(p => { if (ptHit(p)) hit++; });
                    return +(hit * 100 / pts.length).toFixed(1);
                });
            };

            return JSON.stringify({
                '뀍_d2': testDist('뀍', 2),
                '뀍_d3': testDist('뀍', 3),
                '훽_d2': testDist('훽', 2),
                '훽_d3': testDist('훽', 3),
                '될_d2': testDist('될', 2),
                '될_d3': testDist('될', 3)
            });
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
