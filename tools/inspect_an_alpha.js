const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9980;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_an_' + PORT, 'about:blank'
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
    await sleep(2500);

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            Engine.loadText('앉');
            const g = Engine.glyphData;
            // Let's inspect where in the image of 앉 the tick of ㅏ is located!
            // R = 360, W = 360, H = 360
            // Check alpha in the bounding box of x in [60%, 85%], y in [20%, 50%]
            const rowAlpha = [];
            for (let y = Math.round(360 * 0.25); y <= Math.round(360 * 0.45); y += 3) {
                let row = { y: (y / 3.6).toFixed(1) + '%', inkCols: [] };
                for (let x = Math.round(360 * 0.60); x <= Math.round(360 * 0.85); x += 2) {
                    // find if pixel (x, y) is in g.idx
                    // Let's check via canvas
                }
            }

            // Let's find all pixels with x > 69% of 360 (= 248) and y < 55% of 360 (= 198)
            const tickPixels = [];
            for (let i = 0; i < g.idx.length; i++) {
                const p = g.idx[i];
                const x = p % g.W;
                const y = Math.floor(p / g.W);
                if (x > 360 * 0.69 && y < 360 * 0.55 && y > 360 * 0.20) {
                    tickPixels.push({ x: (x / 3.6).toFixed(1) + '%', y: (y / 3.6).toFixed(1) + '%', sid: g.sid[i] });
                }
            }

            // Check stroke 1 (ㅏ stem) and stroke 2 (ㅏ tick) points
            const s1 = Engine.strokes[1];
            const s2 = Engine.strokes[2];

            return {
                tickPixelsCount: tickPixels.length,
                tickOwners: tickPixels.slice(0, 15),
                s1_pts: s1.map(p => [p[0].toFixed(1), p[1].toFixed(1)]),
                s2_pts: s2.map(p => [p[0].toFixed(1), p[1].toFixed(1)])
            };
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(res.result.value, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
