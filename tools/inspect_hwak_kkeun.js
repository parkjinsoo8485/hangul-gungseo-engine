const http = require('http'), { spawn } = require('child_process');
const PORT = 9998;
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
        Engine.loadText('확');
        const gH = Engine.glyphData;
        const W = gH.W, H = gH.H, N = gH.idx.length;
        const sidH = gH.sid;
        const isls = [];
        const visited = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
            if (visited[i] || sidH[i] !== 0) continue;
            const comp = [i]; visited[i] = 1;
            let head = 0;
            let minX = W, maxX = 0, minY = H, maxY = 0;
            while (head < comp.length) {
                const cur = comp[head++];
                const cx = gH.idx[cur] % W, cy = (gH.idx[cur] / W) | 0;
                if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = cx + dx, ny = cy + dy;
                    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                    const j = gH.idx.indexOf(ny * W + nx); // or map
                }
            }
        }
        // Let's do simple bounding box of pixels of s0 with y > 100 vs y <= 100
        const pts0 = [];
        for (let i = 0; i < N; i++) if (sidH[i] === 0) pts0.push({ x: gH.idx[i] % W, y: (gH.idx[i] / W) | 0 });
        const topPts = pts0.filter(p => p.y < 90);
        const botPts = pts0.filter(p => p.y >= 90);
        return {
            topPts_count: topPts.length,
            botPts_count: botPts.length,
            topPts_bbox: [Math.min(...topPts.map(p=>p.x)), Math.min(...topPts.map(p=>p.y)), Math.max(...topPts.map(p=>p.x)), Math.max(...topPts.map(p=>p.y))],
            botPts_bbox: [Math.min(...botPts.map(p=>p.x)), Math.min(...botPts.map(p=>p.y)), Math.max(...botPts.map(p=>p.x)), Math.max(...botPts.map(p=>p.y))]
        };
    })()`);
    console.log(JSON.stringify(res, null, 2));

    chrome.kill();
    process.exit(0);
})();
