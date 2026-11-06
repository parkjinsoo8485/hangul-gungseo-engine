const { spawn } = require('child_process'), http = require('http');
const PORT = 9967;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
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
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1500);

    const r = await send('Runtime.evaluate', {
        expression: `(() => {
            const R = 150, s = R / 100;
            const cvs = document.createElement('canvas'); cvs.width = R; cvs.height = R;
            const ctx = cvs.getContext('2d');
            ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + Engine.styleParams.fontFamily;
            ctx.fillText('갳', R / 2, R / 2);
            const d = ctx.getImageData(0, 0, R, R).data;

            Engine.loadText('갳');
            const st2 = Engine.strokes[2];
            const hits = st2.map(p => {
                const px = Math.round(p[0] * s), py = Math.round(p[1] * s);
                let hit = false;
                for (let dy = -3; dy <= 3; dy++) {
                    for (let dx = -3; dx <= 3; dx++) {
                        const x = px + dx, y = py + dy;
                        if (x >= 0 && x < R && y >= 0 && y < R && d[(y * R + x) * 4 + 3] > 50) hit = true;
                    }
                }
                return { px, py, hit };
            });
            return JSON.stringify(hits);
        })()`
    });
    console.log(r.result.result.value);
    chrome.kill();
    process.exit(0);
})();
