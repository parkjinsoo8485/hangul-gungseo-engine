const { spawn } = require('child_process'), http = require('http');
const PORT = 9969;
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
            const R = 384;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px Batang, serif';

            const measure = (ch) => {
                ctx.clearRect(0, 0, R, R);
                ctx.fillText(ch, R / 2, R / 2);
                const d = ctx.getImageData(0, 0, R, R).data;
                // find ink in top-left region (cho: y < 55%, x < 60%)
                let minX = R, maxX = 0, minY = R, maxY = 0;
                for (let y = 0; y < R * 0.55; y++) {
                    for (let x = 0; x < R * 0.60; x++) {
                        if (d[(y * R + x) * 4 + 3] > 60) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }
                return {
                    ch,
                    x1: +(minX * 100 / R).toFixed(2),
                    x2: +(maxX * 100 / R).toFixed(2),
                    y1: +(minY * 100 / R).toFixed(2),
                    y2: +(maxY * 100 / R).toFixed(2),
                    cx: +(((minX + maxX)/2) * 100 / R).toFixed(2),
                    cy: +(((minY + maxY)/2) * 100 / R).toFixed(2),
                    w: +(((maxX - minX)) * 100 / R).toFixed(2),
                    h: +(((maxY - minY)) * 100 / R).toFixed(2)
                };
            };
            return JSON.stringify(['회', '의', '화', '와', '위', '의'].map(measure));
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
