const { spawn } = require('child_process'), http = require('http');
const PORT = 9973;
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

    const checkList = ['차', '타', '파', '하', '자', '사', '가', '나', '다', '라', '마', '바'];
    const results = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;

        const out = {};
        for (const w of ${JSON.stringify(checkList)}) {
            Engine.loadText(w);
            const g = Engine.glyphData;
            const K = Engine.strokes.length;
            const W = g.W;
            const strokePx = Array.from({length: K}, () => []);
            for (let i = 0; i < g.idx.length; i++) {
                strokePx[g.sid[i]].push({ x: g.idx[i] % W, y: Math.floor(g.idx[i] / W) });
            }

            let splitCount = 0;
            const compList = strokePx.map((pxs, sIdx) => {
                const pset = new Set(pxs.map(p => p.x + ',' + p.y));
                const visited = new Set();
                let comps = 0;
                for (const pt of pxs) {
                    const key = pt.x + ',' + pt.y;
                    if (visited.has(key)) continue;
                    comps++;
                    const q = [pt];
                    visited.add(key);
                    while (q.length > 0) {
                        const c = q.pop();
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (dx === 0 && dy === 0) continue;
                                const nk = (c.x + dx) + ',' + (c.y + dy);
                                if (pset.has(nk) && !visited.has(nk)) {
                                    visited.add(nk);
                                    q.push({ x: c.x + dx, y: c.y + dy });
                                }
                            }
                        }
                    }
                }
                if (comps > 1) splitCount++;
                return comps;
            });
            out[w] = { splitCount, compList };
        }
        return out;
    })()`);

    console.dir(results, { depth: null });
    ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
