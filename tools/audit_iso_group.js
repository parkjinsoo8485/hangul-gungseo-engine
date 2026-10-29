const http = require('http');
const PORT = 9998;
const fs = require('fs');
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_iso_check_' + PORT,
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

    const isoChars = [
        '과', '놔', '돠', '롸', '뫄', '봐', '쏴', '와', '좌', '촤', '콰', '톼', '퐈', '화',
        '괴', '뇌', '되', '뢰', '뫼', '뵈', '쇠', '외', '죄', '최', '쾨', '퇴', '푀', '회',
        '돼', '쇄', '왜', '쾌'
    ];

    console.log(`Auditing ${isoChars.length} isO compound vowel syllables...`);
    const results = [];
    for (const ch of isoChars) {
        const res = await evalJs(`(() => {
            Engine.loadText('${ch}');
            const strokes = Engine.strokes;
            const meta = Engine.strokeMeta;
            const g = Engine.glyphData;
            const R = g.R, W = g.W;

            // Check if any point is in empty air
            let totalAir = 0;
            strokes.forEach((pts, sIdx) => {
                for (let i = 0; i < pts.length; i++) {
                    const px = Math.round(pts[i][0] * R / 100);
                    const py = Math.round(pts[i][1] * R / 100);
                    const pIdx = py * W + px;
                    const idx = g.idx.indexOf(pIdx);
                    if (idx < 0 || g.a[idx] < 20) totalAir++;
                }
            });

            return {
                ch: '${ch}',
                strokesCount: strokes.length,
                totalAir
            };
        })()`);
        results.push(res);
    }

    const fails = results.filter(r => r.totalAir > 15);
    console.log('Audit completed. Fails:', fails.length, fails);

    ws.close(); chrome.kill(); process.exit(0);
}
run();
