const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_ink_check_' + PORT, 'about:blank'
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
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2000);

    const inkInfo = await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '순';
            Engine.loadText('순');

            const g = Engine.glyphData;
            if (!g) return { error: 'no glyphData' };

            // Find ink columns between y = 48% and 60%
            // Canvas size: g.W x g.H
            const W = g.W, H = g.H;
            const ink = g.ink;
            const yStart = Math.floor(H * 0.48);
            const yEnd = Math.floor(H * 0.58);

            const colSums = new Array(W).fill(0);
            for (let y = yStart; y <= yEnd; y++) {
                for (let x = 0; x < W; x++) {
                    if (ink[y * W + x]) colSums[x]++;
                }
            }

            // Find ink span in this vertical range
            const activeCols = [];
            for (let x = 0; x < W; x++) {
                if (colSums[x] > 0) activeCols.push({ xPercent: (x / W * 100).toFixed(2), count: colSums[x] });
            }

            // Find center of mass of the stem
            let totalW = 0, sumX = 0;
            for (let x = 0; x < W; x++) {
                totalW += colSums[x];
                sumX += colSums[x] * (x / W * 100);
            }
            const stemCenter = totalW > 0 ? (sumX / totalW).toFixed(2) : null;

            return {
                W, H,
                yRange: [yStart / H * 100, yEnd / H * 100],
                stemCenterPercent: stemCenter,
                activeColsRange: [activeCols[0]?.xPercent, activeCols[activeCols.length - 1]?.xPercent],
                activeCols
            };
        })()`,
        returnByValue: true
    });

    console.log(JSON.stringify(inkInfo, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
