const { spawn } = require('child_process'), http = require('http');
const PORT = 9954;
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
        const pxs = [];
        for (let i = 0; i < g.idx.length; i++) {
            if (g.sid[i] === 0) {
                pxs.push({ x: g.idx[i] % W, y: Math.floor(g.idx[i] / W) });
            }
        }
        const pset = new Set(pxs.map(p => p.x + ',' + p.y));
        const visited = new Set();
        const comps = [];
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
            comps.push(comp);
        }
        // sort by size desc
        comps.sort((a,b) => b.length - a.length);
        const small = comps[1];
        if (!small) return { error: 'No second comp' };

        let minX = 999, maxX = -1, minY = 999, maxY = -1;
        small.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        // Check stroke 1's bounds
        const s1pxs = [];
        for (let i = 0; i < g.idx.length; i++) {
            if (g.sid[i] === 1) s1pxs.push({ x: g.idx[i] % W, y: Math.floor(g.idx[i] / W) });
        }
        let s1MinX = 999, s1MaxX = -1, s1MinY = 999, s1MaxY = -1;
        s1pxs.forEach(p => {
            if (p.x < s1MinX) s1MinX = p.x;
            if (p.x > s1MaxX) s1MaxX = p.x;
            if (p.y < s1MinY) s1MinY = p.y;
            if (p.y > s1MaxY) s1MaxY = p.y;
        });

        return {
            smallCompCount: small.length,
            smallBounds: { minX, maxX, minY, maxY },
            s1Bounds: { s1MinX, s1MaxX, s1MinY, s1MaxY }
        };
    })()`);
    console.log(info);
    ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
