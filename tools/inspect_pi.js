const http = require('http'), { spawn } = require('child_process');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT, 'about:blank'
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
    ws.onmessage = m => { const j = JSON.parse(m.data); if (j.id && pend[j.id]) { pend[j.id](j); delete pend[j.id]; } };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    };
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const res = await ev(`(() => {
        Engine.loadText('피');
        const g = Engine.glyphData;
        const W = g.W;
        let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
        for (let i = 0; i < g.idx.length; i++) {
            if (g.sid[i] === 3) {
                const x = g.idx[i] % W, y = Math.floor(g.idx[i] / W);
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        }
        return {
            stroke3_bbox: [minX, minY, maxX, maxY],
            s1_first: Engine.strokes[1][0].map(v => (v*3.6).toFixed(1)),
            s1_last: Engine.strokes[1][Engine.strokes[1].length-1].map(v => (v*3.6).toFixed(1)),
            s3_first: Engine.strokes[3][0].map(v => (v*3.6).toFixed(1)),
            s3_last: Engine.strokes[3][Engine.strokes[3].length-1].map(v => (v*3.6).toFixed(1)),
            rawCounts: Engine._glyphDataRawCounts
        };
    })()`);
    console.log(JSON.stringify(res, null, 2));
    chrome.kill();
    process.exit(0);
})();
