const { spawn } = require('child_process'), http = require('http');
const PORT = 9924;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_diag_ink_' + PORT,
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
        const R = 360;
        const cv = document.createElement('canvas'); cv.width = R; cv.height = R;
        const ctx = cv.getContext('2d'); ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + Engine.styleParams.fontFamily;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('썰', R/2, R/2);
        const img = ctx.getImageData(0, 0, R, R).data;

        // In region x: [55, 110], y: [100, 180], where is the ink?
        const inkPts = [];
        for (let y = 100; y <= 180; y++) {
            for (let x = 55; x <= 110; x++) {
                if (img[(y * R + x)*4 + 3] > 30) {
                    inkPts.push([x, y]);
                }
            }
        }
        const s0 = Engine.strokes[0].map(p => [Math.round(p[0]*R/100), Math.round(p[1]*R/100)]);
        const s1 = Engine.strokes[1].map(p => [Math.round(p[0]*R/100), Math.round(p[1]*R/100)]);
        const s2 = Engine.strokes[2].map(p => [Math.round(p[0]*R/100), Math.round(p[1]*R/100)]);
        return {
            totalInRegion: inkPts.length,
            s0_pts: s0,
            s1_pts: s1,
            s2_pts: s2.slice(0, 8),
            inkMinX: Math.min(...inkPts.map(p=>p[0])),
            inkMaxX: Math.max(...inkPts.map(p=>p[0])),
            inkMinY: Math.min(...inkPts.map(p=>p[1])),
            inkMaxY: Math.max(...inkPts.map(p=>p[1])),
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
