const { spawn } = require('child_process'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_alpha_' + PORT, 'about:blank'
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
            const R = 150;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d');
            ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + Engine.styleParams.fontFamily;
            ctx.fillText('획', R/2, R/2);
            const d = ctx.getImageData(0, 0, R, R).data;

            const vals = [];
            for (let ux = 28; ux <= 42; ux += 0.5) {
                const px = Math.round(ux * 1.5), py = Math.round(18.0 * 1.5);
                vals.push({ ux, px, py, alpha: d[(py * R + px) * 4 + 3] });
            }
            return vals;
        })()`,
        returnByValue: true
    });
    console.log(res.result.value.filter(v => v.alpha > 0));
    ws.close(); chrome.kill(); process.exit(0);
})();
