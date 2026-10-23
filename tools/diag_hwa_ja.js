const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9950;
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

    const diag = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;

        // Inspect 화
        Engine.loadText('화');
        const gHwa = Engine.glyphData;
        const KHwa = Engine.strokes.length;
        const hwaCounts = {};
        for (let k = 0; k < KHwa; k++) hwaCounts[k] = 0;
        for (let i = 0; i < gHwa.idx.length; i++) hwaCounts[gHwa.sid[i]]++;

        const hwaStrokes = Engine.strokes.map((s, idx) => ({
            idx,
            part: s.part,
            key: s.key,
            pts: s.points ? s.points.length : (s.pts ? s.pts.length : 0),
            box: s.box,
            bbox: s.bbox,
            count: hwaCounts[idx]
        }));

        // Inspect 자
        Engine.loadText('자');
        const gJa = Engine.glyphData;
        const KJa = Engine.strokes.length;
        const jaCounts = {};
        for (let k = 0; k < KJa; k++) jaCounts[k] = 0;
        const W = gJa.W;
        const jaStrokePx = {};
        for (let k = 0; k < KJa; k++) jaStrokePx[k] = [];
        for (let i = 0; i < gJa.idx.length; i++) {
            const s = gJa.sid[i];
            jaCounts[s]++;
            jaStrokePx[s].push({ x: gJa.idx[i] % W, y: Math.floor(gJa.idx[i] / W) });
        }

        // For each stroke in 자, calculate components
        const jaComps = {};
        for (let k = 0; k < KJa; k++) {
            const pxs = jaStrokePx[k];
            const pset = new Set(pxs.map(p => p.x + ',' + p.y));
            const visited = new Set();
            const compSizes = [];
            for (const pt of pxs) {
                const key = pt.x + ',' + pt.y;
                if (visited.has(key)) continue;
                let csize = 0;
                const q = [pt];
                visited.add(key);
                while (q.length > 0) {
                    const c = q.pop();
                    csize++;
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
                compSizes.push(csize);
            }
            jaComps[k] = compSizes.sort((a,b) => b - a);
        }

        return {
            hwaStrokes,
            jaCounts,
            jaComps,
            jaStrokes: Engine.strokes.map((s, idx) => ({ idx, part: s.part, key: s.key, count: jaCounts[idx] }))
        };
    })()`);

    console.log('화 strokes:');
    console.dir(diag.hwaStrokes, { depth: null });
    console.log('\n자 components:');
    console.dir(diag.jaComps, { depth: null });
    console.log('\n자 strokes:');
    console.dir(diag.jaStrokes, { depth: null });

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
