const { spawn } = require('child_process'), http = require('http');
const PORT = 9967;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT, 'about:blank'
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
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2000);

    const r = await send('Runtime.evaluate', {
        expression: `(() => {
            try {
                const chars = ['까', '따', '매', '파', '해', '코', '뎨', '서', '싸'];
                const out = {};
                const R = 360;
                const ff = Engine.styleParams.fontFamily;
                const cv = document.createElement('canvas'); cv.width = R; cv.height = R;
                const ctx = cv.getContext('2d', { willReadFrequently: true });
                ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;

                for (const ch of chars) {
                    Engine.loadText(ch);
                    ctx.clearRect(0, 0, R, R); ctx.fillText(ch, R / 2, R / 2);
                    const img = ctx.getImageData(0, 0, R, R).data;
                    const meta = Engine.strokeMeta;
                    const g = Engine.glyphData;
                    const chos = [];
                    Engine.strokes.forEach((pts, s) => {
                        if (!meta[s] || (meta[s].part !== 'cho' && meta[s].part !== 'single')) return;
                        let onInk = 0;
                        pts.forEach(p => {
                            const rx = Math.round(p[0] * R / 100), ry = Math.round(p[1] * R / 100);
                            let f = false;
                            for (let dy = -2; dy <= 2 && !f; dy++) for (let dx = -2; dx <= 2; dx++) {
                                if (dx * dx + dy * dy > 4) continue;
                                const x = rx + dx, y = ry + dy;
                                if (x >= 0 && x < R && y >= 0 && y < R && img[(y * R + x) * 4 + 3] > 45) { f = true; break; }
                            }
                            if (f) onInk++;
                        });
                        const n = pts.length;
                        const hit = new Uint8Array(n);
                        let owned = 0;
                        if (g) for (let i = 0; i < g.key.length; i++) {
                            if (Math.floor(g.key[i] / 4096) !== s) continue;
                            owned++;
                            const k = g.key[i] % 4096;
                            if (k >= 1 && k <= n) hit[k - 1] = 1;
                        }
                        const hitEndTail = (() => { for (let i = Math.floor(n * 0.9); i < n; i++) if (hit[i]) return true; return false; })();
                        let minX = 999, maxX = 0, minY = 999, maxY = 0;
                        pts.forEach(p => {
                            minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
                            minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
                        });
                        chos.push({
                            s, ei: meta[s].ei,
                            onInk: (onInk / n).toFixed(2),
                            owned,
                            tailOwned: hitEndTail,
                            start: [+pts[0][0].toFixed(1), +pts[0][1].toFixed(1)],
                            end: [+pts[n - 1][0].toFixed(1), +pts[n - 1][1].toFixed(1)],
                            box: [minX.toFixed(1), minY.toFixed(1), (maxX - minX).toFixed(1), (maxY - minY).toFixed(1)]
                        });
                    });
                    out[ch] = chos;
                }
                return JSON.stringify(out, null, 2);
            } catch(e) {
                return 'ERR: ' + e.stack;
            }
        })()`
    });
    console.log(r.result.result.value);
    chrome.kill();
    process.exit(0);
})();
