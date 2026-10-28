const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9984;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_ck_' + PORT, 'about:blank'
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
            Engine.loadText('회의');
            const g = Engine.glyphData;
            let leftS5 = 0;
            const samples = [];
            for (let i = 0; i < g.idx.length; i++) {
                if (g.sid[i] === 5) {
                    const x = g.idx[i] % g.W;
                    const y = Math.floor(g.idx[i] / g.W);
                    if (x < 360 * 0.64) {
                        leftS5++;
                        if (samples.length < 10) samples.push({ x: (x / 3.6).toFixed(1) + '%', y: (y / 3.6).toFixed(1) + '%' });
                    }
                }
            }
            return { leftS5, samples };
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(res.result.value, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
