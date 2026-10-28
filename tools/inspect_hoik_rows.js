const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_hoik_rows_' + PORT, 'about:blank'
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
            document.getElementById('char-input').value = '획';
            Engine.loadText('획');
            const cv = document.createElement('canvas');
            cv.width = 360; cv.height = 360;
            const ctx = cv.getContext('2d');
            ctx.font = 'normal 292px ' + Engine.styleParams.fontFamily;
            ctx.fillText('획', 180, 180);
            const img = ctx.getImageData(0, 0, 360, 360).data;
            const rows = [];
            for (let y = 140; y <= 200; y++) {
                let cnt = 0;
                for (let x = 40; x <= 200; x++) {
                    if (img[(y * 360 + x) * 4 + 3] > 50) cnt++;
                }
                rows.push({ y, cnt, yPercent: (y / 360 * 100).toFixed(1) });
            }
            return rows;
        })()`,
        returnByValue: true
    });

    console.log(res.result.value.map(r => `${r.y} (${r.yPercent}%): cnt=${r.cnt}`).join('\n'));

    ws.close(); chrome.kill(); process.exit(0);
})();
