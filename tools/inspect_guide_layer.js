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
            const el = document.getElementById('txt-input');
            if (el) { el.value = '획순'; el.dispatchEvent(new Event('input')); }
            Engine.loadText('획순');

            const guideLayer = document.getElementById('layer-guide');
            const polylines = Array.from(guideLayer.querySelectorAll('polyline')).map(p => ({
                points: p.getAttribute('points').split(' ').map(pt => pt.split(',').map(Number))
            }));
            const badges = Array.from(guideLayer.querySelectorAll('g.stroke-badge, circle, text')).map(b => b.outerHTML);

            return JSON.stringify({
                chkGlyph: document.getElementById('chk-glyph')?.checked,
                fontFamily: Engine.styleParams.fontFamily,
                polylines: polylines.map((pl, i) => ({
                    idx: i + 1,
                    p0: pl.points[0],
                    pMid: pl.points[Math.floor(pl.points.length / 2)],
                    pEnd: pl.points[pl.points.length - 1]
                })),
                guideHTML: guideLayer.innerHTML.slice(0, 1000)
            });
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
