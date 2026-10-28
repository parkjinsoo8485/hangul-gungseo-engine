const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_glyph_check_' + PORT, 'about:blank'
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

    const data = await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '획순';
            Engine.loadText('획순');
            const g = Engine.glyphData;
            if (!g) return { error: 'no glyphData' };

            const strokeStats = {};
            for (let i = 0; i < g.idx.length; i++) {
                const sid = g.sid[i];
                const p = g.pid[i];
                const pixIdx = g.idx[i];
                const x = pixIdx % g.W;
                const y = Math.floor(pixIdx / g.W);

                if (!strokeStats[sid]) {
                    strokeStats[sid] = {
                        count: 0,
                        minX: 9999, maxX: -9999,
                        minY: 9999, maxY: -9999,
                        minPid: 9999, maxPid: -9999
                    };
                }
                const st = strokeStats[sid];
                st.count++;
                if (x < st.minX) st.minX = x;
                if (x > st.maxX) st.maxX = x;
                if (y < st.minY) st.minY = y;
                if (y > st.maxY) st.maxY = y;
                if (p < st.minPid) st.minPid = p;
                if (p > st.maxPid) st.maxPid = p;
            }

            return {
                W: g.W, H: g.H,
                totalPixels: g.idx.length,
                strokeStats
            };
        })()`,
        returnByValue: true
    });

    console.log(JSON.stringify(data.result.value, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
