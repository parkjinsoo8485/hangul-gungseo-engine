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
        const img = ctx.getImageData(0, 0, R, R).data;

        const info = decomposeHangul('웨');
        const origB = computeDynamicJamoBounds(img, 0, 1, R, info, 'C', false);
        
        // Let's test stemX_U calculation
        const minX = origB.minX, maxX = origB.maxX, maxY = origB.maxY, yBarC = origB.yBarC, xSplit = origB.splitX;
        const W = R, ci = 0;
        const yStart = Math.min(maxY - 4, yBarC + 4);
        const yEnd = maxY;
        const xRightLimit = Math.max(minX + 8, xSplit - 2);
        let stemX_U = Math.round(minX + (xRightLimit - minX) * 0.5), maxStemRun = -1;
        let stemBot = yStart;
        for (let x = minX + 2; x <= xRightLimit; x++) {
            let run = 0, lastY = yStart;
            for (let y = yStart; y <= yEnd; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) { run++; lastY = y; }
            }
            if (run > maxStemRun) { maxStemRun = run; stemX_U = x; stemBot = lastY; }
        }
        return {
            minX, maxX, splitX: xSplit, yBarC,
            stemX_U, stemBot,
            stemX_U_pct: stemX_U / s,
            stemBot_pct: stemBot / s
        };
    })()`);
    console.log(JSON.stringify(res, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
}
run();
