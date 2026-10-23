const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9964;
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

    const check = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;
        Engine.loadText('화');
        const g = Engine.glyphData;
        const R = 360;

        // Find pixels with y in [10%, 18%] = [36, 65], x in [28%, 38%] = [100, 137]
        const dotPixels = [];
        for (let i = 0; i < g.idx.length; i++) {
            const p = g.idx[i];
            const px = p % g.W, py = (p / g.W) | 0;
            if (px >= 105 && px <= 135 && py >= 36 && py <= 65) {
                const st = (g.key[i] / 4096) | 0;
                dotPixels.push({ px, py, st, k: g.key[i] });
            }
        }
        return {
            dotPixCount: dotPixels.length,
            stCounts: dotPixels.map(p => p.st).reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {}),
            sample: dotPixels.slice(0, 5)
        };
    })()`);
    console.log(JSON.stringify(check, null, 2));

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
