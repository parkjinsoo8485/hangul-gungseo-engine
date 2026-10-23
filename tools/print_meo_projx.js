const { spawn } = require('child_process'), http = require('http');
const PORT = 9986;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT,
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

    const test = await ev(`(() => {
        const R = 150;
        const cv = document.createElement('canvas');
        cv.width = R; cv.height = R;
        const ctx = cv.getContext('2d');
        const ff = Engine.styleParams.fontFamily;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
        ctx.fillText('머', R/2, R/2);
        const d = ctx.getImageData(0,0,R,R).data;

        const projX = [];
        let minX = R, maxX = 0;
        for (let x = 0; x < R; x++) {
            let col = 0;
            for (let y = 0; y < R; y++) if (d[(y * R + x) * 4 + 3] > 50) col++;
            projX.push(col);
            if (col > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }
        return { minX, maxX, projX: projX.slice(minX, maxX + 1) };
    })()`);

    console.log('minX:', test.minX, 'maxX:', test.maxX);
    console.log('projX slice:');
    test.projX.forEach((val, idx) => {
        const absX = test.minX + idx;
        console.log(`x=${absX} (${(idx / (test.maxX - test.minX)).toFixed(2)}): count=${val}`);
    });
    ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
