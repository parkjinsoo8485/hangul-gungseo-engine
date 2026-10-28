const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9995;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_insp_' + PORT, 'about:blank'
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
    await sleep(2500);

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            Engine.loadText('획순');
            const g = Engine.glyphData;
            const svg = document.getElementById('calligraphy-svg');
            const r = svg.getBoundingClientRect();
            
            const stats = [];
            for (let s = 0; s < Engine.strokes.length; s++) {
                let count = 0, minY = 999, maxY = -1, minX = 999, maxX = -1;
                for (let i = 0; i < g.idx.length; i++) {
                    if (g.sid[i] === s) {
                        count++;
                        const x = g.idx[i] % g.W;
                        const y = Math.floor(g.idx[i] / g.W);
                        if (x < minX) minX = x; if (x > maxX) maxX = x;
                        if (y < minY) minY = y; if (y > maxY) maxY = y;
                    }
                }
                stats.push({ s, count, minX, maxX, minY, maxY });
            }
            return { r, stats, W: g.W, H: g.H };
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(res.result.value, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
