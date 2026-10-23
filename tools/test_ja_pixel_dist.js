const { spawn } = require('child_process'), http = require('http');
const PORT = 9957;
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
        Engine.loadText('자');

        // Let's test pixel at 50, 210 against all strokes
        const px = 50, py = 210;
        const R = 360;
        const cv = document.getElementById('glyph-canvas');
        const ctx = cv.getContext('2d');
        const img = ctx.getImageData(0,0,R,R).data;

        const results = [];
        for (let k = 0; k < Engine.strokes.length; k++) {
            const pts = Engine.strokes[k];
            let minDist = 1e9, bestPt = null;
            for (let i = 0; i < pts.length; i++) {
                const sx = pts[i][0] * 3.6, sy = pts[i][1] * 3.6;
                const d = Math.hypot(px - sx, py - sy);
                if (d < minDist) { minDist = d; bestPt = [sx, sy, i]; }
            }
            results.push({ k, minDist, bestPt });
        }
        return results;
    })()`);
    console.log('Distance from (50, 210) to each stroke:');
    console.dir(info, { depth: null });
    ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
