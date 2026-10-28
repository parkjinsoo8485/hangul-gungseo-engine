const { spawn } = require('child_process'), http = require('http');
const PORT = 9993;
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
            ctx.fillText('안', R / 2, R / 2);
            const d = ctx.getImageData(0, 0, R, R).data;

            // Find all connected components
            const visited = new Uint8Array(R * R);
            const comps = [];
            for (let y = 0; y < R; y++) {
                for (let x = 0; x < R; x++) {
                    if (d[(y * R + x) * 4 + 3] > 50 && !visited[y * R + x]) {
                        let minX = x, maxX = x, minY = y, maxY = y, count = 0;
                        const q = [[x, y]];
                        visited[y * R + x] = 1;
                        let head = 0;
                        while (head < q.length) {
                            const [cx, cy] = q[head++];
                            count++;
                            if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                            if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
                            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                                const nx = cx + dx, ny = cy + dy;
                                if (nx >= 0 && nx < R && ny >= 0 && ny < R && d[(ny * R + nx) * 4 + 3] > 50 && !visited[ny * R + nx]) {
                                    visited[ny * R + nx] = 1;
                                    q.push([nx, ny]);
                                }
                            }
                        }
                        comps.push({
                            count,
                            minX: +(minX/s).toFixed(1), maxX: +(maxX/s).toFixed(1),
                            minY: +(minY/s).toFixed(1), maxY: +(maxY/s).toFixed(1)
                        });
                    }
                }
            }
            return JSON.stringify(comps);
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
