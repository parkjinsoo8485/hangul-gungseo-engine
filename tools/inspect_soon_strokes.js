const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_soon_debug_' + PORT, 'about:blank'
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

            // Let's inspect the strokes for '순'
            // Strokes 0, 1: ㅅ
            // Strokes 2, 3: ㅜ
            // Stroke 4: ㄴ
            return {
                strokes: Engine.strokes.map((pts, idx) => ({
                    idx,
                    p0: pts[0],
                    pend: pts[pts.length - 1],
                    yRange: [Math.min(...pts.map(p=>p[1])), Math.max(...pts.map(p=>p[1]))],
                    xRange: [Math.min(...pts.map(p=>p[0])), Math.max(...pts.map(p=>p[0]))]
                }))
            };
        })()`,
        returnByValue: true
    });

    console.log(JSON.stringify(res.result.value, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
