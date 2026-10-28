const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_stem_meas_' + PORT, 'about:blank'
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

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '순';
            Engine.loadText('순');
            const g = Engine.glyphData;
            const W = g.W, H = g.H;
            const jb = Engine.dynBounds[0];

            // Scan column stemX_U +- 3
            const col = jb.stemX_U;
            const inkY = [];
            const cv = document.createElement('canvas');
            cv.width = 360; cv.height = 360;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(360 * 0.81) + 'px ' + Engine.styleParams.fontFamily;
            ctx.fillText('순', 180, 180);
            const img = ctx.getImageData(0, 0, 360, 360).data;

            let topY = null, botY = null;
            for (let y = Math.round(jb.jungY1); y < 360; y++) {
                let hasInk = false;
                for (let x = col - 4; x <= col + 4; x++) {
                    if (img[(y * 360 + x) * 4 + 3] > 60) { hasInk = true; break; }
                }
                if (hasInk) {
                    if (topY === null) topY = y;
                    botY = y;
                }
            }

            return {
                stemCol: col,
                stemTopY: topY,
                stemTopPercent: (topY / 360 * 100).toFixed(2),
                stemBotY: botY,
                stemBotPercent: (botY / 360 * 100).toFixed(2),
                actualStemHeight: (botY - topY) / 360 * 100
            };
        })()`,
        returnByValue: true
    });

    console.log(JSON.stringify(res.result.value, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
