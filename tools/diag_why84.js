const { spawn } = require('child_process'), http = require('http');
const PORT = 9923;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_diag_why84_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { }
        await sleep(250);
    }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 0; const pend = {};
    ws.onmessage = m => {
        const j = JSON.parse(m.data);
        if (j.id && pend[j.id]) { pend[j.id](j); delete pend[j.id]; }
    };
    const send = (method, params = {}) => new Promise(r => {
        const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params }));
    });
    const ev = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    };
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const fn = `(() => {
        Engine.loadText('썰');
        const g = Engine.glyphData;
        const R = 360;
        // Find which pixels were assigned to stroke 0 or 2, but were geometrically closest to stroke 1
        const st1 = Engine.strokes[1];
        let closest1Count = 0;
        let lostTo0 = 0, lostTo2 = 0, keptBy1 = 0;
        for (let i = 0; i < g.idx.length; i++) {
            const idx = g.idx[i];
            const x = idx % R, y = Math.floor(idx / R);
            const owner = g.sid[i];
            // Check geometric closest stroke among 0, 1, 2, 3
            let minD = 1e9, closest = -1;
            for (let k = 0; k < 4; k++) {
                const st = Engine.strokes[k];
                for (let p of st) {
                    const px = p[0] * R / 100, py = p[1] * R / 100;
                    const d = (x - px)*(x - px) + (y - py)*(y - py);
                    if (d < minD) { minD = d; closest = k; }
                }
            }
            if (closest === 1) {
                closest1Count++;
                if (owner === 1) keptBy1++;
                else if (owner === 0) lostTo0++;
                else if (owner === 2) lostTo2++;
            }
        }
        return {
            closest1Count,
            keptBy1,
            lostTo0,
            lostTo2
        };
    })()`;

    const res = await ev(fn);
    console.log(JSON.stringify(res, null, 2));

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => {
    console.error('DIAG ERR:', e.message);
    chrome.kill();
    process.exit(1);
});
