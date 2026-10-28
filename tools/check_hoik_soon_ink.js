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
    await sleep(2000);

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const el = document.getElementById('txt-input');
            if (el) { el.value = '획순'; el.dispatchEvent(new Event('input')); }
            Engine.loadText('획순');
            Engine.stopDemo();

            const R = 150, s = R / 100;
            const off = document.createElement('canvas');
            off.width = R * 2; off.height = R;
            const ctx = off.getContext('2d');
            const ff = Engine.styleParams.fontFamily;
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
            ctx.fillText('획', R / 2, R / 2);
            ctx.fillText('순', R + R / 2, R / 2);
            const d = ctx.getImageData(0, 0, R * 2, R).data;

            const ptHit = (p) => {
                const px = Math.round(p[0] * s), py = Math.round(p[1] * s);
                for (let dy = -3; dy <= 3; dy++) {
                    for (let dx = -3; dx <= 3; dx++) {
                        const x = px + dx, y = py + dy;
                        if (x >= 0 && x < R * 2 && y >= 0 && y < R && d[(y * R * 2 + x) * 4 + 3] > 50) return true;
                    }
                }
                return false;
            };

            return JSON.stringify(Engine.strokes.map((st, idx) => {
                const len = st.length;
                const onInk = st.filter(ptHit).length;
                const ratio = Math.round((onInk / len) * 1000) / 10;
                const meta = Engine.strokeMeta[idx];
                const entry = Engine.jamoEntries[meta?.ei];
                return {
                    sIdx: idx + 1,
                    ch: meta.ci === 0 ? '획' : '순',
                    part: meta.part,
                    whId: entry?.whId,
                    ratio,
                    len,
                    p0: [+st[0][0].toFixed(1), +st[0][1].toFixed(1)],
                    pEnd: [+st[st.length-1][0].toFixed(1), +st[st.length-1][1].toFixed(1)],
                    fbox: entry?.fbox?.map(v => +v.toFixed(1)),
                    so: entry?.so?.[meta.si]?.map(v => +v.toFixed(1))
                };
            }));
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
