const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_ink_map_' + PORT, 'about:blank'
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

            const g = Engine.glyphData;
            // Let's create an ASCII map of ink between y=40% and y=75%
            const W = g.W, H = g.H;
            // Find which stroke owns each pixel
            // Map grid: 60 columns x 35 rows
            const grid = [];
            const yMin = Math.floor(H * 0.40);
            const yMax = Math.floor(H * 0.75);
            
            // Build an array of owner strokes for pixels
            const ownerMap = new Int16Array(W * H).fill(-1);
            for (let i = 0; i < g.idx.length; i++) {
                ownerMap[g.idx[i]] = g.sid[i];
            }

            const rows = [];
            for (let y = yMin; y < yMax; y += 3) {
                let line = (y / H * 100).toFixed(0).padStart(3, ' ') + '%: ';
                for (let x = Math.floor(W * 0.35); x < Math.floor(W * 0.85); x += 3) {
                    const o = ownerMap[y * W + x];
                    if (o === -1) line += ' ';
                    else line += String(o);
                }
                rows.push(line);
            }

            return { rows };
        })()`,
        returnByValue: true
    });

    console.log(res.result.value.rows.join('\n'));

    ws.close(); chrome.kill(); process.exit(0);
})();
