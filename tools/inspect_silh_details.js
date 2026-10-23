const http = require('http'), { spawn } = require('child_process');
const PORT = 9997;
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

    const res = await ev(`(() => {
        Engine.loadText('싫');
        // Let's inspect step by step how D and owners are computed
        const R = 360, ci = 0, W = 360;
        const off = document.createElement('canvas'); off.width = R; off.height = R;
        const ctx = off.getContext('2d');
        ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'normal ' + Math.round(R * 0.81) + 'px \"KoPub Batang\", \"Batang\", serif';
        ctx.fillText('싫', R / 2, R / 2);
        const img = ctx.getImageData(0, 0, R, R).data;

        // Find cellPixMap and compId
        const cellPixMap = new Int32Array(R * R).fill(-1);
        const pxX = [], pxY = [];
        for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
            if (img[(y * W + x) * 4 + 3] >= 12) {
                cellPixMap[y * R + x] = pxX.length;
                pxX.push(x); pxY.push(y);
            }
        }
        const P = pxX.length;
        const compId = new Int32Array(P).fill(-1);
        let numComps = 0;
        const bfsQ = new Int32Array(P);
        for (let p0 = 0; p0 < P; p0++) {
            if (compId[p0] >= 0) continue;
            const cid = numComps++; compId[p0] = cid;
            let head = 0, tail = 0; bfsQ[tail++] = p0;
            while (head < tail) {
                const cur = bfsQ[head++];
                const lx = pxX[cur], ly = pxY[cur];
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const nx = lx + dx, ny = ly + dy;
                    if (nx < 0 || nx >= R || ny < 0 || ny >= R) continue;
                    const nb = cellPixMap[ny * R + nx];
                    if (nb >= 0 && compId[nb] < 0) { compId[nb] = cid; bfsQ[tail++] = nb; }
                }
            }
        }

        // Now strokeComps for s0 and s1
        const s0 = Engine.strokes[0], s1 = Engine.strokes[1];
        const getComps = (sPts) => {
            const counts = new Map();
            sPts.forEach(p => {
                const gx = Math.round(p[0] * 3.6), gy = Math.round(p[1] * 3.6);
                for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) {
                    const nx = gx + dx, ny = gy + dy;
                    if (nx < 0 || nx >= R || ny < 0 || ny >= R) continue;
                    const pIdx = cellPixMap[ny * R + nx];
                    if (pIdx >= 0) counts.set(compId[pIdx], (counts.get(compId[pIdx]) || 0) + 1);
                }
            });
            return Array.from(counts.entries());
        };

        const comp0 = getComps(s0);
        const comp1 = getComps(s1);

        // Find actual ink pixels near s1
        const nearS1 = [];
        for (let p = 0; p < P; p++) {
            const lx = pxX[p], ly = pxY[p];
            if (ly >= 80 && ly <= 190 && lx >= 100 && lx <= 220) {
                let d0 = 1e9, d1 = 1e9;
                s0.forEach(pt => { const d = Math.hypot(lx - pt[0]*3.6, ly - pt[1]*3.6); if (d < d0) d0 = d; });
                s1.forEach(pt => { const d = Math.hypot(lx - pt[0]*3.6, ly - pt[1]*3.6); if (d < d1) d1 = d; });
                if (d1 < d0 && d1 < 25) {
                    nearS1.push({ x: lx, y: ly, d0: d0.toFixed(1), d1: d1.toFixed(1) });
                }
            }
        }

        // Check why s0 won over s1 for a pixel near s1:
        // Let's find pixel with min d1
        let minD1Pix = null, minD1 = 1e9;
        nearS1.forEach(p => {
            if (parseFloat(p.d1) < minD1) { minD1 = parseFloat(p.d1); minD1Pix = p; }
        });

        // Now run exact lines 3386-3428 from index.html for this pixel
        // Let's check what effN[0] vs effN[1] are!
        // Let's trace why minD1Pix (x: 135, y: 134) was given sid 0
        // We can inspect the values of D, retractedEnd, retractedStart, effN, etc.
        const trace = await (async () => {
            // Let's inspect index.html variables if possible, or replicate:
            const s0 = Engine.strokes[0], s1 = Engine.strokes[1];
            // Check retractedEnd and retractedStart for s0 and s1
            return {
                s0_len: s0.length, s1_len: s1.length,
                s0_start: s0[0], s0_end: s0[s0.length-1],
                s1_start: s1[0], s1_end: s1[s1.length-1]
            };
        })();

        return {
            minD1Pix,
            trace
        };
    })()`);
    console.log(JSON.stringify(res, null, 2));

    chrome.kill();
    process.exit(0);
})();
