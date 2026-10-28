const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9986;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_bup_' + PORT, 'about:blank'
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(3500);

    const evalCode = async (expr) => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
        return r.result.value;
    };

    const res = await evalCode(`(() => {
        Engine.loadText('법');
        const g = Engine.glyphData;
        const R = 360;
        const off = document.createElement('canvas');
        off.width = R; off.height = R;
        const ctx = off.getContext('2d');
        const ff = Engine.styleParams.fontFamily;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
        ctx.fillText('법', R / 2, R / 2);
        const img = ctx.getImageData(0, 0, R, R).data;

        // Find ink pixels for y > 60%
        const xs = [];
        for (let y = Math.round(R * 0.60); y < R; y++) {
            for (let x = 0; x < R; x++) {
                if (img[(y * R + x) * 4 + 3] > 50) xs.push(Math.round(x * 100 / R));
            }
        }
        const minX = Math.min(...xs), maxX = Math.max(...xs);

        const jb = Engine.cachedDynBounds ? Engine.cachedDynBounds[0] : null;

        return {
            inkJongX: [minX, maxX],
            jb,
            s7: Engine.strokes[7] ? [Engine.strokes[7][0], Engine.strokes[7][Engine.strokes[7].length - 1]] : null,
            s8: Engine.strokes[8] ? [Engine.strokes[8][0], Engine.strokes[8][Engine.strokes[8].length - 1]] : null,
            s9: Engine.strokes[9] ? [Engine.strokes[9][0], Engine.strokes[9][Engine.strokes[9].length - 1]] : null
        };
    })()`);

    console.log('Bup debug:', JSON.stringify(res, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
