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

    const testWords = ['싫', '흐', '피', '패', '해', '레', '권', '확', '환', '활', '황', '훨', '휘', '희', '끊', '읊', '묶', '봤', '정음'];

    const res = await ev(`(() => {
        // Let's test custom assimilation logic on these words
        function simulateAssimilation(word) {
            Engine.loadText(word);
            // We can get idxList, sidList from before assimilation if we want, or run our own pass on glyphData
            const g = Engine.glyphData;
            const W = g.W, H = g.H;
            const N = g.idx.length;
            const sid = Int16Array.from(g.sid);
            const K = Engine.strokes.length;

            const posToI = new Int32Array(W * H).fill(-1);
            for (let i = 0; i < N; i++) posToI[g.idx[i]] = i;

            // 8-connected island analysis for each stroke
            const strokeCounts = {};
            for (let k = 0; k < K; k++) strokeCounts[k] = 0;
            for (let i = 0; i < N; i++) strokeCounts[sid[i]]++;

            // For each stroke, find all 8-connected components
            const visited = new Uint8Array(N);
            const strokeIslands = Array.from({ length: K }, () => []);

            for (let i = 0; i < N; i++) {
                if (visited[i]) continue;
                const s = sid[i];
                const comp = [i];
                visited[i] = 1;
                let head = 0;
                while (head < comp.length) {
                    const cur = comp[head++];
                    const p = g.idx[cur];
                    const cx = p % W, cy = (p / W) | 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = cx + dx, ny = cy + dy;
                            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                            const j = posToI[ny * W + nx];
                            if (j >= 0 && !visited[j] && sid[j] === s) {
                                visited[j] = 1;
                                comp.push(j);
                            }
                        }
                    }
                }
                strokeIslands[s].push(comp);
            }

            const splitInfo = [];
            for (let k = 0; k < K; k++) {
                const islands = strokeIslands[k];
                if (islands.length > 1) {
                    islands.sort((a, b) => b.length - a.length);
                    splitInfo.push({ k, total: strokeCounts[k], sizes: islands.map(isl => isl.length) });
                } else if (islands.length === 0) {
                    splitInfo.push({ k, zero: true });
                }
            }

            return { word, K, splits: splitInfo };
        }

        return ${JSON.stringify(testWords)}.map(simulateAssimilation);
    })()`);

    console.log(JSON.stringify(res, null, 2));

    chrome.kill();
    process.exit(0);
})();
