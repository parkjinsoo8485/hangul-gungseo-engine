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

    const testWords = ['췌'];
    for (const w of testWords) {
        const res = await ev(`(() => {
            Engine.loadText('${w}');
            const g = Engine.glyphData;
            const W = g.W, H = g.H, N = g.idx.length;
            const sid = g.sid;
            const posToI = new Int32Array(W * H).fill(-1);
            for (let i = 0; i < N; i++) posToI[g.idx[i]] = i;
            const visited = new Uint8Array(N);
            const isls = [];
            for (let i = 0; i < N; i++) {
                if (visited[i] || sid[i] !== 0) continue;
                const comp = [i]; visited[i] = 1;
                let head = 0;
                let minX = W, maxX = 0, minY = H, maxY = 0;
                while(head < comp.length) {
                    const cur = comp[head++];
                    const cx = g.idx[cur] % W, cy = (g.idx[cur] / W) | 0;
                    if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                    if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
                    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = cx + dx, ny = cy + dy;
                        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                        const j = posToI[ny * W + nx];
                        if (j >= 0 && !visited[j] && sid[j] === 0) {
                            visited[j] = 1; comp.push(j);
                        }
                    }
                }
                isls.push({ len: comp.length, bbox: [minX, minY, maxX, maxY] });
            }
            return {
                w: '${w}',
                b: Engine.dynBounds[0],
                isls,
                s0_pts: Engine.strokes[0].map(p => [(p[0]*3.6).toFixed(1), (p[1]*3.6).toFixed(1)]),
                s1_pts: Engine.strokes[1].map(p => [(p[0]*3.6).toFixed(1), (p[1]*3.6).toFixed(1)])
            };
        })()`);
        console.log(JSON.stringify(res, null, 2));
    }

    chrome.kill();
    process.exit(0);
})();
