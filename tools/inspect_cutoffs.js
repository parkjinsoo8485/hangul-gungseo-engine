const http = require('http');
const PORT = 9997;
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_det_' + PORT,
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

    for (let i = 0; i < 30; i++) {
        const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
        if (chk.result && chk.result.value) break;
        await sleep(300);
    }

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    const chars = ['읊', '홰', '훚', '밆', '쨒', '젩', '뚨', '옅', '섪', '믪'];
    const res = await evalJs(`(() => {
        const chars = ${JSON.stringify(chars)};
        const details = [];

        chars.forEach(ch => {
            Engine.loadText(ch);
            const strokes = Engine.strokes;
            const g = Engine.glyphData;
            const R = g.R, W = g.W;
            const K = strokes.length;

            strokes.forEach((pts, sIdx) => {
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
                const ptsSpan = ptsMaxY - ptsMinY;
                const pixSpan = maxY - minY;
                const meta = Engine.strokeMeta ? Engine.strokeMeta[sIdx] : null;

                if (ptsSpan > 80 && pixSpan < ptsSpan * 0.70) {
                    details.push({
                        ch,
                        sIdx: sIdx + 1,
                        meta,
                        ptsSpan,
                        pixSpan,
                        diff: ptsSpan - pixSpan,
                        ptsY: [ptsMinY, ptsMaxY],
                        pixY: [minY, maxY]
                    });
                }
            });
        });

        return details;
    })()`);

    console.log(JSON.stringify(res, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
