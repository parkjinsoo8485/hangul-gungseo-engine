const { spawn } = require('child_process'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_jb_' + PORT, 'about:blank'
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
            const R = 150, s = R / 100;
            const off = document.createElement('canvas');
            off.width = R * 2; off.height = R;
            const ctx = off.getContext('2d');
            ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + Engine.styleParams.fontFamily;
            ctx.fillText('획', R/2, R/2);
            ctx.fillText('순', R + R/2, R/2);
            const d = ctx.getImageData(0, 0, R * 2, R).data;

            const jb0 = computeDynamicJamoBounds(d, 0, 2, R, decomposeHangul('획'), 'C', true);
            const jb1 = computeDynamicJamoBounds(d, 1, 2, R, decomposeHangul('순'), 'H', true);

            return {
                hoik: Object.fromEntries(Object.entries(jb0).map(([k, v]) => [k, typeof v === 'number' ? +(v/s).toFixed(1) : v])),
                soon: Object.fromEntries(Object.entries(jb1).map(([k, v]) => [k, typeof v === 'number' ? +(v/s).toFixed(1) : v]))
            };
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(res.result.value, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
