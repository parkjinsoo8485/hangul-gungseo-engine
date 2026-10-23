const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9947;
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

    const res = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;
        Engine.loadText('국어');

        // Check initial state
        const s0_target = Engine.glyphShown;

        Engine.currentStroke = 5;
        Engine.currentStep = Engine.strokes[5].length;
        Engine.renderGlyphInk();
        const s5_target = Engine.glyphShown;

        const cv = document.getElementById('glyph-canvas');
        const ctx = cv.getContext('2d');
        const img = ctx.getImageData(0, 0, cv.width, cv.height);
        let nonZero = 0;
        let rightNonZero = 0;
        for (let y = 0; y < cv.height; y++) {
            for (let x = 0; x < cv.width; x++) {
                const a = img.data[(y * cv.width + x) * 4 + 3];
                const r = img.data[(y * cv.width + x) * 4];
                if (a > 0 && r < 50) {
                    nonZero++;
                    if (x >= cv.width / 2) rightNonZero++;
                }
            }
        }
        return {
            s0_target,
            s5_target,
            nonZero,
            rightNonZero,
            cvW: cv.width,
            cvH: cv.height,
            cvStyleW: cv.style.width,
            cvStyleH: cv.style.height
        };
    })()`);
    console.log(res);

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
