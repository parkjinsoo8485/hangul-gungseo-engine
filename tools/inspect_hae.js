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
        Engine.loadText('해');
        const s1 = Engine.strokes[1], s2 = Engine.strokes[2];
        const g = Engine.glyphData;
        const W = g.W;
        // Test distance to s1 vs s2 for a point on the bar of ㅎ (e.g. x: 100, y: 130)
        let d1 = 1e9, d2 = 1e9;
        s1.forEach(p => { const d = Math.hypot(100 - p[0]*3.6, 130 - p[1]*3.6); if (d < d1) d1 = d; });
        s2.forEach(p => { const d = Math.hypot(100 - p[0]*3.6, 130 - p[1]*3.6); if (d < d2) d2 = d; });

        return {
            d1: d1.toFixed(1), d2: d2.toFixed(1),
            s1_pts: s1.map(p => [(p[0]*3.6).toFixed(1), (p[1]*3.6).toFixed(1)]),
            s2_top: s2.slice(0, 5).map(p => [(p[0]*3.6).toFixed(1), (p[1]*3.6).toFixed(1)])
        };
    })()`);
    console.log(JSON.stringify(res, null, 2));

    chrome.kill();
    process.exit(0);
})();
