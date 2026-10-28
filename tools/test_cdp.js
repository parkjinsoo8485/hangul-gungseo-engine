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
            try {
                Engine.loadText('의');
                const info = decomposeHangul('의');
                const ci = 0;
                const W = Engine.glyphRasterW, H = Engine.glyphRasterH;
                const img = Engine.glyphRasterData;
                const R = 384;
                const b = computeDynamicJamoBounds(img, ci, 1, R, info, 'C', false);
                let minX = 999, maxX = 0, minY = 999, maxY = 0;
                for (let y = Math.round(b.minY * R / 100); y <= Math.round(b.choY2 * R / 100); y++) {
                    for (let x = Math.round(b.minX * R / 100); x <= Math.round(b.splitX * R / 100); x++) {
                        const a = img[(y * W + x) * 4 + 3];
                        if (a > 64) {
                            const px = x * 100 / R, py = y * 100 / R;
                            if (px < minX) minX = px;
                            if (px > maxX) maxX = px;
                            if (py < minY) minY = py;
                            if (py > maxY) maxY = py;
                        }
                    }
                }
                return JSON.stringify({
                    bounds: b,
                    choInk: { minX, maxX, minY, maxY, cx: (minX + maxX)/2, cy: (minY + maxY)/2 },
                    jamoEntries: Engine.jamoEntries.map(e => ({ part: e.part, subPart: e.subPart, box: e.box, fbox: e.fbox }))
                });
            } catch(e) {
                return e.stack;
            }
        })()`,
        returnByValue: true
    });
    console.log(res.result.value);
    ws.close(); chrome.kill(); process.exit(0);
})();
