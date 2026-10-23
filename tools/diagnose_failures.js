const http = require('http'), { spawn } = require('child_process');
const PORT = 9996;
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

    const chars = ['싫', '흐', '피', '패', '해', '레', '권', '확', '환', '활', '황', '훨', '휘', '희', '끊', '읊', '묶', '봤', '정음'];
    for (const ch of chars) {
        const report = await ev(`(() => {
            Engine.loadText('${ch}');
            const g = Engine.glyphData;
            const K = Engine.strokes.length;
            const strokeCounts = {};
            for (let k = 0; k < K; k++) strokeCounts[k] = 0;
            const W = g.W;
            const strokePixels = {};
            for (let k = 0; k < K; k++) strokePixels[k] = [];

            for (let i = 0; i < g.idx.length; i++) {
                const s = g.sid[i];
                if (strokeCounts[s] !== undefined) strokeCounts[s]++;
                const idx = g.idx[i];
                const px = idx % W;
                const py = Math.floor(idx / W);
                if (strokePixels[s]) strokePixels[s].push({ x: px, y: py });
            }

            const splits = [];
            for (let k = 0; k < K; k++) {
                if (!strokeCounts[k]) {
                    splits.push({ k, zero: true, strokeInfo: Engine.strokes[k] ? Engine.strokes[k].length : 0 });
                    continue;
                }
                const pts = strokePixels[k];
                const set = new Set(pts.map(p => p.x + ',' + p.y));
                const visited = new Set();
                const islands = [];
                for (const p of pts) {
                    const key = p.x + ',' + p.y;
                    if (visited.has(key)) continue;
                    let count = 0;
                    const q = [p];
                    visited.add(key);
                    let minX = p.x, maxX = p.x, minY = p.y, maxY = p.y;
                    while (q.length > 0) {
                        const cur = q.pop();
                        count++;
                        if (cur.x < minX) minX = cur.x; if (cur.x > maxX) maxX = cur.x;
                        if (cur.y < minY) minY = cur.y; if (cur.y > maxY) maxY = cur.y;
                        for (const [dx, dy] of [[1,0], [-1,0], [0,1], [0,-1]]) {
                            const nk = (cur.x + dx) + ',' + (cur.y + dy);
                            if (set.has(nk) && !visited.has(nk)) {
                                visited.add(nk);
                                q.push({ x: cur.x + dx, y: cur.y + dy });
                            }
                        }
                    }
                    islands.push({ count, bbox: [minX, minY, maxX, maxY] });
                }
                if (islands.length > 1) {
                    // sort descending by count
                    islands.sort((a,b) => b.count - a.count);
                    splits.push({ k, totalPixels: strokeCounts[k], islands });
                }
            }
            return { ch: '${ch}', K, strokeCounts, splits };
        })()`);
        console.log(JSON.stringify(report, null, 2));
    }
    chrome.kill();
    process.exit(0);
})();
