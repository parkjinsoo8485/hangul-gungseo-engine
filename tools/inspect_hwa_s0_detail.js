const { spawn } = require('child_process'), http = require('http');
const PORT = 9959;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
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

    const info = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;
        Engine.loadText('화');

        const s0 = Engine.strokes[0];
        const s1 = Engine.strokes[1];
        const jb = Engine.jamoBounds;
        const e0 = Engine.jamoEntries[0];

        // Find top ink pixels in 화 around stroke 0
        const R = 360;
        const cv = document.getElementById('glyph-canvas');
        const ctx = cv.getContext('2d');
        const img = ctx.getImageData(0,0,R,R).data;

        const topPxs = [];
        for (let y = 0; y < 140; y++) {
            for (let x = 0; x < 200; x++) {
                if (img[(y * R + x) * 4 + 3] > 50) {
                    topPxs.push({ x, y });
                }
            }
        }
        return {
            s0_pts: s0.map(p => [+(p[0]*3.6).toFixed(1), +(p[1]*3.6).toFixed(1)]),
            s1_pts: s1.map(p => [+(p[0]*3.6).toFixed(1), +(p[1]*3.6).toFixed(1)]),
            e0_fbox: e0.fbox,
            topPxsCount: topPxs.length,
            topPxsSample: topPxs.slice(0, 10),
            topPxsYMin: Math.min(...topPxs.map(p => p.y)),
            topPxsYMax: Math.max(...topPxs.map(p => p.y))
        };
    })()`);

    console.log(info);
    ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
