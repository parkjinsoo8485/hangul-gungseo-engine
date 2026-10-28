const { spawn } = require('child_process'), http = require('http');
const PORT = 9996;
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
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r.result); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1500);

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const R = 150, s = R / 100;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const ff = Engine.styleParams.fontFamily;
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
            ctx.fillText('됙', R / 2, R / 2);
            const d = ctx.getImageData(0, 0, R, R).data;

            const grid = [];
            for (let uy = 43; uy <= 51; uy++) {
                let row = uy + ': ';
                const py = Math.round(uy * s);
                for (let ux = 28; ux <= 42; ux++) {
                    const px = Math.round(ux * s);
                    const hasInk = d[(py * R + px) * 4 + 3] > 50;
                    row += hasInk ? '#' : '.';
                }
                grid.push(row);
            }
            return JSON.stringify(grid);
        })()`,
        returnByValue: true
    });
    console.log(JSON.parse(res.result.value).join('\n'));
    ws.close(); chrome.kill(); process.exit(0);
})();
