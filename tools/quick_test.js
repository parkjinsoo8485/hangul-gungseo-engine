const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9977;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) { }
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
    await send('Page.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 50; i++) {
        try {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
        } catch (e) { }
        await sleep(250);
    }

    const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

    const chars = ['궁', '웨', '되', '쵁', '쮓', '둿', '뙯', '럽', '쇗'];
    for (const testChar of chars) {
        const r = await evalJs(`(() => {
            Engine.loadText('${testChar}');
            const strokes = Engine.strokes;
            const meta = Engine.strokeMeta;
            const g = Engine.glyphData;
            const R = g.R, W = g.W;
            const out = [];
            strokes.forEach((pts, sIdx) => {
                let air = 0;
                const step = Math.max(1, Math.floor(pts.length / 6));
                for (let pi = 1; pi < pts.length - 1; pi += step) {
                    const px = Math.round(pts[pi][0] * R / 100);
                    const py = Math.round(pts[pi][1] * R / 100);
                    const pIdx = py * W + px;
                    const idx = g.idx.indexOf(pIdx);
                    if (idx < 0 || g.a[idx] < 20) air++;
                }
                out.push({ sIdx: sIdx+1, whId: meta[sIdx] && meta[sIdx].whId, air, total: pts.length });
            });
            return { ch: '${testChar}', out };
        })()`);
        console.log(testChar, JSON.stringify(r.out));
    }

    ws.close();
    chrome.kill();
}
main().catch(console.error);
