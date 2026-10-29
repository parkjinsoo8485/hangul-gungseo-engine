const http = require('http');
const PORT = 9998;
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_hwe_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { }
        await sleep(250);
    }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => {
            const r = JSON.parse(data);
            if (r.id === reqId) { ws.removeEventListener('message', onMsg); if (r.error) rej(r.error); else res(r.result); }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    const res = await evalJs(`(() => {
        Engine.loadText('홰');
        const strokes = Engine.strokes;
        const g = Engine.glyphData;
        const R = g.R, W = g.W;

        // Check stroke stats
        const strokeStats = strokes.map((pts, sIdx) => {
            let count = 0;
            let minY = 1e9, maxY = -1e9;
            for (let i = 0; i < g.key.length; i++) {
                const s = Math.floor(g.key[i] / 4096);
                if (s === sIdx) {
                    count++;
                    const y = Math.floor(g.idx[i] / W);
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
            let ptsMinY = 1e9, ptsMaxY = -1e9;
            pts.forEach(p => {
                const py = p[1] * R / 100;
                if (py < ptsMinY) ptsMinY = py;
                if (py > ptsMaxY) ptsMaxY = py;
            });
            return {
                sIdx: sIdx + 1,
                meta: Engine.strokeMeta[sIdx],
                count,
                pixSpan: maxY - minY,
                ptsSpan: ptsMaxY - ptsMinY,
                ptsY: [ptsMinY, ptsMaxY],
                pixY: [minY, maxY]
            };
        });

        // Check who owns pixels with x in stroke 6 range and y from 217 to 280
        const yAfter217Owners = {};
        for (let y = 217; y <= 280; y++) {
            for (let x = 200; x <= 225; x++) {
                const p = y * W + x;
                const idx = g.idx.indexOf(p);
                if (idx >= 0) {
                    const s = Math.floor(g.key[idx] / 4096);
                    yAfter217Owners[s] = (yAfter217Owners[s] || 0) + 1;
                }
            }
        }

        return {
            strokeStats,
            yAfter217Owners
        };
    })()`);

    console.log(JSON.stringify(res, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
