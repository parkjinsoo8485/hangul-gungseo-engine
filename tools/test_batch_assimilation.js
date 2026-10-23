const { spawn } = require('child_process'), http = require('http');
const PORT = 9989;
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

    const checkWords = [
        '더', '머', '버', '저', '처', '퍼', '허',
        '노', '도', '로', '보', '소', '오', '조', '초', '코', '토', '호',
        '구', '누', '쿠', '드', '르', '므', '즈', '츠', '크', '트', '프', '흐',
        '화', '확', '환', '활', '황', '홰', '회', '획', '훼', '휘', '희', '흰',
        '국어', '한글', '조형', '완성'
    ];

    const results = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;

        const out = {};
        for (const w of ${JSON.stringify(checkWords)}) {
            Engine.loadText(w);
            const g = Engine.glyphData;
            const K = Engine.strokes.length;
            const W = g.W, H = g.H;

            // Build 2D owner grid
            const grid = new Int16Array(W * H).fill(-1);
            for (let i = 0; i < g.idx.length; i++) {
                grid[g.idx[i]] = g.sid[i];
            }

            // Topological island assimilation
            for (let pass = 0; pass < 3; pass++) {
                for (let k = 0; k < K; k++) {
                    const kIndices = [];
                    for (let i = 0; i < g.idx.length; i++) {
                        if (grid[g.idx[i]] === k) kIndices.push(g.idx[i]);
                    }
                    if (kIndices.length === 0) continue;

                    const pset = new Set(kIndices);
                    const visited = new Set();
                    const comps = [];

                    for (const idx of kIndices) {
                        if (visited.has(idx)) continue;
                        const comp = [idx];
                        const q = [idx];
                        visited.add(idx);
                        while (q.length > 0) {
                            const curr = q.pop();
                            const cx = curr % W, cy = Math.floor(curr / W);
                            for (let dx = -1; dx <= 1; dx++) {
                                for (let dy = -1; dy <= 1; dy++) {
                                    if (dx === 0 && dy === 0) continue;
                                    const nx = cx + dx, ny = cy + dy;
                                    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                                    const nidx = ny * W + nx;
                                    if (pset.has(nidx) && !visited.has(nidx)) {
                                        visited.add(nidx);
                                        q.push(nidx);
                                        comp.push(nidx);
                                    }
                                }
                            }
                        }
                        comps.push(comp);
                    }

                    if (comps.length <= 1) continue;
                    comps.sort((a,b) => b.length - a.length);

                    for (let ci = 1; ci < comps.length; ci++) {
                        const small = comps[ci];
                        if (small.length > kIndices.length * 0.35) continue;

                        const neighborCounts = {};
                        for (const sIdx of small) {
                            const sx = sIdx % W, sy = Math.floor(sIdx / W);
                            for (let dx = -1; dx <= 1; dx++) {
                                for (let dy = -1; dy <= 1; dy++) {
                                    if (dx === 0 && dy === 0) continue;
                                    const nx = sx + dx, ny = sy + dy;
                                    if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                                    const nOwner = grid[ny * W + nx];
                                    if (nOwner >= 0 && nOwner !== k) {
                                        neighborCounts[nOwner] = (neighborCounts[nOwner] || 0) + 1;
                                    }
                                }
                            }
                        }

                        let bestNeighbor = -1, maxNeighborCount = 0;
                        for (const [nOwner, count] of Object.entries(neighborCounts)) {
                            if (count > maxNeighborCount) {
                                maxNeighborCount = count;
                                bestNeighbor = parseInt(nOwner);
                            }
                        }

                        if (bestNeighbor >= 0) {
                            for (const sIdx of small) {
                                grid[sIdx] = bestNeighbor;
                            }
                        }
                    }
                }
            }

            // Measure final components
            let splitStrokes = 0;
            const postComps = Array.from({length: K}, () => 0);
            for (let k = 0; k < K; k++) {
                const kIndices = [];
                for (let i = 0; i < g.idx.length; i++) {
                    if (grid[g.idx[i]] === k) kIndices.push(g.idx[i]);
                }
                if (kIndices.length === 0) continue;
                const pset = new Set(kIndices);
                const visited = new Set();
                let cCount = 0;
                for (const idx of kIndices) {
                    if (visited.has(idx)) continue;
                    cCount++;
                    const q = [idx];
                    visited.add(idx);
                    while (q.length > 0) {
                        const curr = q.pop();
                        const cx = curr % W, cy = Math.floor(curr / W);
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = cx + dx, ny = cy + dy;
                                if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;
                                const nidx = ny * W + nx;
                                if (pset.has(nidx) && !visited.has(nidx)) {
                                    visited.add(nidx);
                                    q.push(nidx);
                                }
                            }
                        }
                    }
                }
                postComps[k] = cCount;
                if (cCount > 1) splitStrokes++;
            }
            out[w] = { splitStrokes, postComps };
        }
        return out;
    })()`);

    console.dir(results, { depth: null });
    const failed = Object.entries(results).filter(([w, r]) => r.splitStrokes > 0);
    console.log(`Failed syllables: ${failed.length} / ${checkWords.length}`);
    if (failed.length) console.log('Failed:', failed.map(f => f[0]));

    ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
