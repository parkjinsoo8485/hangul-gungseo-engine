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
            const ff = Engine.styleParams.fontFamily;

            const testChar = (ch) => {
                Engine.loadText(ch);
                ctx.clearRect(0, 0, R, R);
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
                ctx.fillText(ch, R / 2, R / 2);
                const d = ctx.getImageData(0, 0, R, R).data;

                const ptHit = (p, maxD = 3) => {
                    const px = Math.round(p[0] * s), py = Math.round(p[1] * s);
                    for (let dy = -maxD; dy <= maxD; dy++) {
                        for (let dx = -maxD; dx <= maxD; dx++) {
                            const x = px + dx, y = py + dy;
                            if (x >= 0 && x < R && y >= 0 && y < R && d[(y * R + x) * 4 + 3] > 50) return true;
                        }
                    }
                    return false;
                };

                return Engine.strokes.map((st, idx) => {
                    const len0 = st.length;
                    let iStart = 0;
                    const maxStartTrim = Math.floor(len0 * 0.22);
                    while (iStart < maxStartTrim && !ptHit(st[iStart])) iStart++;
                    let iEnd = len0 - 1;
                    const minEndTrim = Math.max(iStart + 4, Math.floor(len0 * 0.78));
                    while (iEnd > minEndTrim && !ptHit(st[iEnd])) iEnd--;
                    const pts = (iEnd - iStart + 1 >= Math.max(4, Math.floor(len0 * 0.70))) ? st.slice(iStart, iEnd + 1) : st;
                    const onInk = pts.filter(p => ptHit(p)).length;
                    const ratio = Math.round((onInk / pts.length) * 1000) / 10;
                    const meta = Engine.strokeMeta[idx];
                    const entry = Engine.jamoEntries[meta?.ei];
                    return {
                        sIdx: idx + 1,
                        part: meta?.part,
                        whId: entry?.whId,
                        ratio,
                        len: pts.length,
                        p0: [+pts[0][0].toFixed(1), +pts[0][1].toFixed(1)],
                        pEnd: [+pts[pts.length-1][0].toFixed(1), +pts[pts.length-1][1].toFixed(1)]
                    };
                });
            };

            return JSON.stringify({
                nye: testChar('녜'),
                ttwoek: testChar('뛲'),
                kkoek: testChar('꾁')
            });
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
