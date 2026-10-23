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
        Engine.loadText('끊');
        const g = Engine.glyphData;
        const W = g.W, H = g.H, N = g.idx.length;
        const sid = Int16Array.from(g.sid);
        const K = Engine.strokes.length;
        // In raw glyphData, what strokes are 4 and 5?
        const counts = {};
        for (let i = 0; i < N; i++) counts[sid[i]] = (counts[sid[i]] || 0) + 1;

        // Check what sid values touch the island in stroke 3
        const posToI = new Int32Array(W * H).fill(-1);
        for (let i = 0; i < N; i++) posToI[g.idx[i]] = i;

        const island3_pts = [];
        for (let i = 0; i < N; i++) {
            if (sid[i] === 3) {
                const x = g.idx[i] % W, y = (g.idx[i] / W) | 0;
                if (x >= 190) island3_pts.push({ x, y, i });
            }
        }

        const borderVotes = {};
        island3_pts.forEach(p => {
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = p.x + dx, ny = p.y + dy;
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                const j = posToI[ny * W + nx];
                if (j >= 0 && sid[j] !== 3) {
                    const s = sid[j];
                    borderVotes[s] = (borderVotes[s] || 0) + 1;
                }
            }
        });

        const je = Engine.jamoEntries.filter(e => e.part === 'jong');
        return je.map(e => ({
            id: e.whId,
            box: e.box,
            norm: e.norm.map(s => [s[0], s[s.length-1]])
        }));
    })()`);
    console.log(JSON.stringify(res, null, 2));

    chrome.kill();
    process.exit(0);
})();
