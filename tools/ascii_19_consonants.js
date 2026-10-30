const { spawn } = require('child_process'), http = require('http');
const PORT = 9984;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_ascii_cons_' + PORT,
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
        await sleep(200);
    }

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const chars = ['ㄱ','ㄹ','ㅂ','ㅋ','ㄲ','ㅃ','ㅆ','ㅉ','가','따','빠','파','하','차','호','혹','토'];
            const R = 360;
            const ff = Engine.styleParams.fontFamily;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;

            const out = {};
            for (const ch of chars) {
                Engine.loadText(ch);
                ctx.clearRect(0, 0, R, R);
                ctx.fillText(ch, R / 2, R / 2);
                const img = ctx.getImageData(0, 0, R, R).data;

                // Create 50x35 grid covering [15..85] x [15..85]
                const Wg = 56, Hg = 36;
                const grid = Array.from({ length: Hg }, () => new Array(Wg).fill(' '));
                for (let gy = 0; gy < Hg; gy++) {
                    const y100 = 15 + (gy / (Hg - 1)) * 70;
                    const py = Math.round(y100 * R / 100);
                    for (let gx = 0; gx < Wg; gx++) {
                        const x100 = 15 + (gx / (Wg - 1)) * 70;
                        const px = Math.round(x100 * R / 100);
                        if (img[(py * R + px) * 4 + 3] > 60) grid[gy][gx] = '.';
                    }
                }
                Engine.strokes.forEach((pts, sIdx) => {
                    const label = String(sIdx + 1);
                    pts.forEach(p => {
                        const gx = Math.round(((p[0] - 15) / 70) * (Wg - 1));
                        const gy = Math.round(((p[1] - 15) / 70) * (Hg - 1));
                        if (gx >= 0 && gx < Wg && gy >= 0 && gy < Hg) {
                            grid[gy][gx] = label;
                        }
                    });
                });
                out[ch] = grid.map(r => r.join('')).join('\\n');
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    for (const [ch, art] of Object.entries(data)) {
        console.log(`\n=== ${ch} ===\n${art}`);
    }
    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
