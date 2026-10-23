const http = require('http'), { spawn } = require('child_process');
const PORT = 9997;
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
        Engine.loadText('싫');
        const g = Engine.glyphData;
        const W = g.W;
        // Find pixels where sid === 0
        let s0_minX = 1e9, s0_maxX = -1, s0_minY = 1e9, s0_maxY = -1;
        let s0_rightOf120 = 0;
        let s0_rightOf140 = 0;
        let s0_rightOf160 = 0;
        for (let i = 0; i < g.idx.length; i++) {
            if (g.sid[i] === 0) {
                const x = g.idx[i] % W, y = Math.floor(g.idx[i] / W);
                if (x < s0_minX) s0_minX = x; if (x > s0_maxX) s0_maxX = x;
                if (y < s0_minY) s0_minY = y; if (y > s0_maxY) s0_maxY = y;
                if (x > 120) s0_rightOf120++;
                if (x > 140) s0_rightOf140++;
                if (x > 160) s0_rightOf160++;
            }
        }

        // Check distance to s0 vs s1 for a point on s1 (e.g. 150, 140)
        const s0 = Engine.strokes[0], s1 = Engine.strokes[1];
        const testPts = [[130, 130], [140, 140], [150, 145], [160, 150], [170, 160]];
        const dists = testPts.map(([tx, ty]) => {
            let d0 = 1e9, d1 = 1e9;
            s0.forEach(p => { const d = Math.hypot(tx - p[0]*3.6, ty - p[1]*3.6); if (d < d0) d0 = d; });
            s1.forEach(p => { const d = Math.hypot(tx - p[0]*3.6, ty - p[1]*3.6); if (d < d1) d1 = d; });
            return { pt: [tx, ty], d0: d0.toFixed(1), d1: d1.toFixed(1) };
        });

        return {
            s0_bounds: [s0_minX, s0_minY, s0_maxX, s0_maxY],
            s0_rightOf120, s0_rightOf140, s0_rightOf160,
            dists
        };
    })()`);
    console.log(JSON.stringify(res, null, 2));

    chrome.kill();
    process.exit(0);
})();
