const { spawn } = require('child_process'), http = require('http');
const PORT = 9977;
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

        const inspectChar = w => {
            Engine.loadText(w);
            const g = Engine.glyphData;
            const K = Engine.strokes.length;
            const W = g.W;
            const strokePx = Array.from({length: K}, () => []);
            for (let i = 0; i < g.idx.length; i++) {
                strokePx[g.sid[i]].push({ x: g.idx[i] % W, y: Math.floor(g.idx[i] / W) });
            }

            const comps = strokePx.map((pxs, sIdx) => {
                const pset = new Set(pxs.map(p => p.x + ',' + p.y));
                const visited = new Set();
                const compList = [];
                for (const pt of pxs) {
                    const key = pt.x + ',' + pt.y;
                    if (visited.has(key)) continue;
                    const comp = [pt];
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
                                    const nextPt = { x: c.x + dx, y: c.y + dy };
                                    q.push(nextPt);
                                    comp.push(nextPt);
                                }
                            }
                        }
                    }
                    compList.push(comp);
                }
                compList.sort((a,b) => b.length - a.length);
                return {
                    sIdx,
                    comps: compList.map(c => ({
                        count: c.length,
                        minX: Math.min(...c.map(p => p.x)),
                        maxX: Math.max(...c.map(p => p.x)),
                        minY: Math.min(...c.map(p => p.y)),
                        maxY: Math.max(...c.map(p => p.y))
                    }))
                };
            });
            return comps.filter(c => c.comps.length > 1);
        };

        return {
            neo: inspectChar('너'),
            no: inspectChar('노')
        };
    })()`);

    console.dir(info, { depth: null });
    ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
