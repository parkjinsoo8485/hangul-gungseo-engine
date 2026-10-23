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

    const data = await ev(`(() => {
        Engine.loadText('획순');
        return {
            charsInfo: Engine.charsInfo,
            jamoEntries: Engine.jamoEntries.map((e, idx) => ({
                idx,
                part: e.part,
                subPart: e.subPart,
                whId: e.whId,
                box: e.box,
                strokeCount: e.norm.length
            })),
            strokeMeta: Engine.strokeMeta,
            strokes: Engine.strokes.map((s, sIdx) => {
                const p0 = s[0], pLast = s[s.length - 1];
                return {
                    sIdx,
                    len: s.length,
                    start: [(p0[0]).toFixed(1), (p0[1]).toFixed(1)],
                    end: [(pLast[0]).toFixed(1), (pLast[1]).toFixed(1)],
                    startBadge: Engine.glyphStartAnchor(sIdx)
                };
            })
        };
    })()`);

    console.log(JSON.stringify(data, null, 2));

    chrome.kill();
    process.exit(0);
})();
