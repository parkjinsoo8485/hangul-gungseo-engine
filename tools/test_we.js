const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9963;
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
        Engine.loadText('웨');
        const s4 = Engine.strokes[4];
        const s5 = Engine.strokes[5];
        const g = Engine.glyphData;
        const R = 360;

        // Check distance of ink pixels with x > 230 (64%)
        let inkCount = 0;
        let s4Count = 0, s5Count = 0;
        let minX = 999, maxX = -999;
        for (let i = 0; i < g.idx.length; i++) {
            const p = g.idx[i];
            const px = p % g.W, py = (p / g.W) | 0;
            if (px > 220) {
                inkCount++;
                if (px < minX) minX = px; if (px > maxX) maxX = px;
                const st = (g.key[i] / 4096) | 0;
                if (st === 4) s4Count++;
                if (st === 5) s5Count++;
            }
        }
        return {
            s4_p0: s4[0],
            s4_pLast: s4[s4.length - 1],
            s5_p0: s5[0],
            s5_pLast: s5[s5.length - 1],
            inkCount,
            minX, maxX,
            s4Count,
            s5Count
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
