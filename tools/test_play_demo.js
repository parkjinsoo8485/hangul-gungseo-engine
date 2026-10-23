const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9942;
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

    // Let's actually trigger playDemo()!
    // And see what happens during playDemo()!
    const trace = await ev(`(async () => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;
        Engine.loadText('국어');

        // Let's inspect playDemo execution!
        const cv = document.getElementById('glyph-canvas');
        const ctx = cv.getContext('2d');
        const snapshots = [];

        // Let's spy on renderGlyphInk or stepAnim
        const origRender = Engine.renderGlyphInk.bind(Engine);
        let calls = 0;
        Engine.renderGlyphInk = function() {
            origRender();
            calls++;
            if (calls % 10 === 0 || Engine.currentStep === 0) {
                // sample
            }
        };

        return {
            isGlyphMode: Engine.isGlyphMode(),
            canvasDisplay: cv.style.display,
            canvasW: cv.width,
            canvasH: cv.height,
            strokesCount: Engine.strokes.length
        };
    })()`);
    console.log('Trace init:', trace);

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
