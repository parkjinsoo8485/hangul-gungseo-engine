const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9988;
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

        // Check ratio of on-ink points for all strokes in 굍
        const ratios = Engine.strokes.map((pts, si) => {
            let hit = 0;
            pts.forEach(p => {
                const px = Math.round(p[0] * s), py = Math.round(p[1] * s);
                let on = false;
                for (let dy = -3; dy <= 3; dy++) {
                    for (let dx = -3; dx <= 3; dx++) {
                        const x = px + dx, y = py + dy;
                        if (x >= 0 && x < R && y >= 0 && y < R && img[(y * R + x) * 4 + 3] > 50) on = true;
                    }
                }
                if (on) hit++;
            });
            return {
                si: si + 1,
                hit,
                total: pts.length,
                ratio: Math.round(hit * 1000 / pts.length) / 10
            };
        });

        return { ratios };
    })()`);

    console.log('Ratios for 굍 in Engine with buildGlyphData:', JSON.stringify(res, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
