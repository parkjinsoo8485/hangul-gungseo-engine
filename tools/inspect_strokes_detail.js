const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_centerlines_' + PORT, 'about:blank'
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

    const info = await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '획순';
            Engine.loadText('획순');

            const jamoKeys = Engine.strokes.map((s, idx) => {
                return {
                    idx: idx + 1,
                    first5: s.slice(0, 5).map(p => [Number(p[0].toFixed(2)), Number(p[1].toFixed(2))]),
                    last5: s.slice(-5).map(p => [Number(p[0].toFixed(2)), Number(p[1].toFixed(2))])
                };
            });

            return {
                strokesCount: Engine.strokes.length,
                jamoKeys,
                badgePositions: Engine.badgePositions
            };
        })()`,
        returnByValue: true
    });

    console.log(JSON.stringify(info.result.value, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
