const { spawn } = require('child_process'), http = require('http');
const PORT = 9956;
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
        const g = Engine.glyphData;
        const W = g.W;

        // Find the pixel at x=50, y=210
        let targetIdx = -1;
        for (let i = 0; i < g.idx.length; i++) {
            const px = g.idx[i] % W;
            const py = Math.floor(g.idx[i] / W);
            if (px === 50 && py === 210) { targetIdx = i; break; }
        }
        if (targetIdx === -1) {
            // Find any pixel in the small comp
            for (let i = 0; i < g.idx.length; i++) {
                const px = g.idx[i] % W;
                const py = Math.floor(g.idx[i] / W);
                if (px >= 45 && px <= 60 && py >= 208 && py <= 214 && g.sid[i] === 0) {
                    targetIdx = i; break;
                }
            }
        }

        const sid = targetIdx >= 0 ? g.sid[targetIdx] : -1;
        const pid = targetIdx >= 0 ? g.pid[targetIdx] : -1;
        return { targetIdx, sid, pid, pixel: targetIdx >= 0 ? { x: g.idx[targetIdx] % W, y: Math.floor(g.idx[targetIdx] / W) } : null };
    })()`);
    console.log(info);
    ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
