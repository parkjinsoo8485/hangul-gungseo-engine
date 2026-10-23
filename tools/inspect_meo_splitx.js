const { spawn } = require('child_process'), http = require('http');
const PORT = 9984;
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

    const test = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;
        Engine.loadText('머');

        // Let's inspect pixel at x=140, y=130 in 머
        const g = Engine.glyphData;
        const W = g.W;
        let pIdx = -1;
        for (let i = 0; i < g.idx.length; i++) {
            const x = g.idx[i] % W, y = Math.floor(g.idx[i] / W);
            if (x === 140 && y === 130) { pIdx = i; break; }
        }

        // Also check what jb was computed as
        const R = 150;
        const cv = document.createElement('canvas');
        cv.width = R; cv.height = R;
        const ctx = cv.getContext('2d');
        const ff = Engine.styleParams.fontFamily;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
        ctx.fillText('머', R/2, R/2);
        const d = ctx.getImageData(0,0,R,R).data;
        const info = decomposeHangul('머');
        const jb = computeDynamicJamoBounds(d, 0, 1, R, info, 'V', false);

        return {
            jb_splitX_150: jb.splitX,
            jb_splitX_360: jb.splitX * 2.4,
            pOwner: pIdx >= 0 ? g.sid[pIdx] : -1
        };
    })()`);

    console.log(test);
    ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
