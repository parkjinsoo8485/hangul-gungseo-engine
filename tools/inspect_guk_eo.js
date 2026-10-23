const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9939;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--window-size=1600,1000',
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { }
        await sleep(250);
    }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 0; const pend = {};
    ws.onmessage = m => {
        const j = JSON.parse(m.data);
        if (j.id && pend[j.id]) { pend[j.id](j); delete pend[j.id]; }
    };
    const send = (method, params = {}) => new Promise(r => {
        const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params }));
    });
    const ev = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    };
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const report = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;
        Engine.loadText('국어');

        const g = Engine.glyphData;
        const totalPixels = g ? g.idx.length : 0;
        const strokeStats = [];

        for (let s = 0; s < Engine.strokes.length; s++) {
            const pts = Engine.strokes[s];
            const meta = Engine.strokeMeta[s];
            let pixCount = 0;
            let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
            if (g) {
                for (let i = 0; i < g.idx.length; i++) {
                    const k = g.key[i];
                    const st = (k / 4096) | 0;
                    if (st === s) {
                        pixCount++;
                        const p = g.idx[i];
                        const px = p % g.W, py = (p / g.W) | 0;
                        if (px < minX) minX = px; if (px > maxX) maxX = px;
                        if (py < minY) minY = py; if (py > maxY) maxY = py;
                    }
                }
            }
            strokeStats.push({
                s,
                part: meta.part,
                subPart: meta.subPart,
                p0: pts[0],
                pLast: pts[pts.length - 1],
                ptsLen: pts.length,
                pixCount,
                box: { minX, maxX, minY, maxY }
            });
        }
        return {
            totalStrokes: Engine.strokes.length,
            totalPixels,
            strokeStats,
            charsInfo: Engine.charsInfo
        };
    })()`);

    console.log(JSON.stringify(report, null, 2));

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
