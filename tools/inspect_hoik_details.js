const http = require('http'), { spawn } = require('child_process');
const PORT = 9999;
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
        Engine.loadText('획');
        const s = Engine.strokes;
        return s.map((st, i) => {
            const xs = st.map(p => p[0]), ys = st.map(p => p[1]);
            return {
                i,
                badge: Engine.badgePositions ? Engine.badgePositions[i] : null,
                minX: Math.min(...xs).toFixed(1),
                maxX: Math.max(...xs).toFixed(1),
                minY: Math.min(...ys).toFixed(1),
                maxY: Math.max(...ys).toFixed(1),
                first5: st.slice(0, 5).map(p => [p[0].toFixed(1), p[1].toFixed(1)]),
                last3: st.slice(-3).map(p => [p[0].toFixed(1), p[1].toFixed(1)])
            };
        });
    })()`);

    console.log(JSON.stringify(res, null, 2));
    chrome.kill();
    process.exit(0);
})();
