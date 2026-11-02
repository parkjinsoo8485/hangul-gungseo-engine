const http = require('http');
const PORT = 9947;
const { spawn } = require('child_process');

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_prof_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    try {
        let list;
        for (let i = 0; i < 40; i++) {
            try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) {}
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
        await send('Page.navigate', { url: 'http://localhost:8080/index.html?t=' + Date.now() });
        for (let i = 0; i < 40; i++) {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
            await sleep(250);
        }

        const chars = ['꽈', '뻐', '째', '쏜', '톤', '효', '텐', '련'];
        const res = await send('Runtime.evaluate', {
            expression: `(() => {
                const out = {};
                for (const ch of ${JSON.stringify(chars)}) {
                    Engine.loadText(ch);
                    const g = Engine.glyphData;
                    const R = g.R, W = g.W;
                    const alphaBuf = new Uint8Array(W * R);
                    for (let i = 0; i < g.idx.length; i++) alphaBuf[g.idx[i]] = g.a[i];
                    const grid = [];
                    for (let uy = 10; uy <= 66; uy += 2) {
                        let line = String(uy).padStart(2, ' ') + ': ';
                        for (let ux = 10; ux <= 80; ux += 1) {
                            const px = Math.round(ux * R / 100);
                            const py = Math.round(uy * R / 100);
                            let mark = alphaBuf[py * W + px] >= 50 ? '#' : '.';
                            Engine.strokes.forEach((st, sIdx) => {
                                if (Engine.strokeMeta[sIdx].part !== 'cho') return;
                                for (const p of st) {
                                    if (Math.abs(p[0] - ux) < 0.7 && Math.abs(p[1] - uy) < 1.1) {
                                        mark = String(sIdx + 1);
                                    }
                                }
                            });
                            line += mark;
                        }
                        grid.push(line);
                    }
                    out[ch] = grid.join('\\n');
                }
                return out;
            })()`,
            returnByValue: true
        });

        for (const [ch, g] of Object.entries(res.result.value)) {
            console.log(`=== ${ch} (x=10..80, y=10..66) ===\n` + g);
        }
        ws.close();
    } finally {
        chrome.kill();
    }
})();
