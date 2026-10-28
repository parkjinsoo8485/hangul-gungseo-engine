const http = require('http');
const PORT = 9980;
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,950',
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_we_' + PORT, 'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    const res = await evalJs(`(() => {
        Engine.loadText('웨');
        const strokes = Engine.strokes;
        const meta = Engine.strokeMeta;
        
        // Let's inspect each stroke's start and end, and compare with glyph ink
        const R = 150, s = R / 100;
        const ff = Engine.styleParams.fontFamily;
        const canvas = document.createElement('canvas');
        canvas.width = R; canvas.height = R;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
        ctx.fillText('웨', R / 2, R / 2);
        const d = ctx.getImageData(0, 0, R, R).data;

        const ptHit = p => {
            const px = Math.round(p[0] * s), py = Math.round(p[1] * s);
            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const x = px + dx, y = py + dy;
                    if (x >= 0 && x < R && y >= 0 && y < R && d[(y * R + x) * 4 + 3] > 50) return true;
                }
            }
            return false;
        };

        return strokes.map((pts, idx) => {
            let hit = 0;
            pts.forEach(p => { if (ptHit(p)) hit++; });
            return {
                idx: idx + 1,
                part: meta[idx] ? meta[idx].part : null,
                subPart: meta[idx] ? meta[idx].subPart : null,
                len: pts.length,
                hitRatio: Math.round(hit / pts.length * 1000) / 10,
                start: [Math.round(pts[0][0]*10)/10, Math.round(pts[0][1]*10)/10],
                end: [Math.round(pts[pts.length-1][0]*10)/10, Math.round(pts[pts.length-1][1]*10)/10]
            };
        });
    })()`);
    console.log(JSON.stringify(res, null, 2));
    ws.close();
    chrome.kill();
}
run();
