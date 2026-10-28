const { spawn } = require('child_process'), http = require('http');
const PORT = 9996;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT, 'about:blank'
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
    await sleep(2000);

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            Engine.loadText('획순');
            const box = document.getElementById('canvas-box');
            const r = box.getBoundingClientRect();
            const cv = document.getElementById('glyph-canvas');
            const svg = document.getElementById('calligraphy-svg');
            const cr = cv.getBoundingClientRect();
            const sr = svg.getBoundingClientRect();
            return JSON.stringify({
                box: { left: r.left, top: r.top, width: r.width, height: r.height },
                canvas: { left: cr.left, top: cr.top, width: cr.width, height: cr.height, cw: cv.width, ch: cv.height },
                svg: { left: sr.left, top: sr.top, width: sr.width, height: sr.height, vb: svg.getAttribute('viewBox') }
            });
        })()`,
        returnByValue: true
    });
    console.log(JSON.parse(res.result.value));
    ws.close(); chrome.kill(); process.exit(0);
})();
