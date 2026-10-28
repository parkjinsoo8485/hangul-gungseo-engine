const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9989;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_h2_' + PORT, 'about:blank'
], { stdio: 'ignore' });
const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    let list;
    for (let i = 0; i < 40; i++) { try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { } await sleep(250); }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r.result); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            Engine.loadText('회의');
            const g = Engine.glyphData;
            // Let's inspect which pixels around y = 68% (y in [65%, 72%]) belong to stroke 4 vs stroke 5
            // In glyphData: R = 360, W = 720, H = 360
            // x from 0 to 360 (the first character '회')
            const rowData = [];
            for (let y = Math.round(360 * 0.65); y <= Math.round(360 * 0.73); y += 2) {
                let row = { y: (y / 360 * 100).toFixed(1) + '%', s4_range: null, s5_range: null };
                let s4_min = 999, s4_max = -1;
                let s5_min = 999, s5_max = -1;
                for (let x = Math.round(360 * 0.45); x <= Math.round(360 * 0.75); x++) {
                    const idx = y * g.W + x;
                    // find in g.idx
                    // Since g.idx is sorted by sid, pid, let's look up directly
                }
            }

            // Direct pixel ownership map
            const owner = new Int8Array(360 * 360).fill(-1);
            for (let i = 0; i < g.idx.length; i++) {
                const p = g.idx[i];
                const x = p % g.W;
                const y = Math.floor(p / g.W);
                if (x < 360) {
                    owner[y * 360 + x] = g.sid[i];
                }
            }

            const analysis = [];
            for (let y = Math.round(360 * 0.65); y <= Math.round(360 * 0.72); y += 2) {
                let s4_min = 999, s4_max = -1;
                let s5_min = 999, s5_max = -1;
                for (let x = Math.round(360 * 0.45); x <= Math.round(360 * 0.75); x++) {
                    const o = owner[y * 360 + x];
                    if (o === 4) { if (x < s4_min) s4_min = x; if (x > s4_max) s4_max = x; }
                    if (o === 5) { if (x < s5_min) s5_min = x; if (x > s5_max) s5_max = x; }
                }
                analysis.push({
                    y: (y / 3.6).toFixed(1) + '%',
                    s4: s4_max >= 0 ? [ (s4_min / 3.6).toFixed(1) + '%', (s4_max / 3.6).toFixed(1) + '%' ] : null,
                    s5: s5_max >= 0 ? [ (s5_min / 3.6).toFixed(1) + '%', (s5_max / 3.6).toFixed(1) + '%' ] : null
                });
            }

            // Check stroke 4 points
            const s4_pts = Engine.strokes[4].map(p => [p[0].toFixed(1), p[1].toFixed(1)]);
            const s5_pts = Engine.strokes[5].map(p => [p[0].toFixed(1), p[1].toFixed(1)]);

            return { analysis, s4_last: s4_pts[s4_pts.length - 1], s5_first: s5_pts[0], s5_x: s5_pts[Math.round(s5_pts.length * 0.7)] };
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(res.result.value, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
