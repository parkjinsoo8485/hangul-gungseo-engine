const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9943;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--window-size=1600,1000',
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

    const strokeLog = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;
        Engine.loadText('국어');

        // Inspect each stroke's points in detail:
        return Engine.strokes.map((st, i) => {
            const meta = Engine.strokeMeta[i];
            const pStart = st[0];
            const pEnd = st[st.length - 1];
            // Direction:
            const dx = pEnd[0] - pStart[0];
            const dy = pEnd[1] - pStart[1];
            return {
                i,
                part: meta.part,
                subPart: meta.subPart,
                whId: Engine.jamoEntries[meta.ei] ? Engine.jamoEntries[meta.ei].whId : 'unknown',
                ptsCount: st.length,
                pStart: [Math.round(pStart[0]*10)/10, Math.round(pStart[1]*10)/10],
                pEnd: [Math.round(pEnd[0]*10)/10, Math.round(pEnd[1]*10)/10],
                dx: Math.round(dx*10)/10,
                dy: Math.round(dy*10)/10,
                directionDesc: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'Left-to-Right' : 'Right-to-Left') : (dy > 0 ? 'Top-to-Bottom' : 'Bottom-to-Top'),
                allPts: st.map(p => [Math.round(p[0]*10)/10, Math.round(p[1]*10)/10])
            };
        });
    })()`);

    console.log(JSON.stringify(strokeLog, null, 2));

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
