const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9944;
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

    const s3 = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;
        Engine.loadText('국어');
        const s4 = Engine.strokes[4];
        return {
            s3_len: Engine.strokes[3].length,
            s3_start: Engine.strokes[3][0],
            s3_end: Engine.strokes[3][Engine.strokes[3].length - 1],
            s4_ㅇ_start: s4[0],
            s4_ㅇ_pt1: s4[1],
            s4_ㅇ_pt10: s4[10],
            s4_dir: (s4[5][0] > s4[0][0]) ? 'clockwise (RIGHT)' : 'counter-clockwise (LEFT)',
            s5_tick: {
                start: Engine.strokes[5][0],
                end: Engine.strokes[5][Engine.strokes[5].length - 1]
            },
            s6_vert: {
                start: Engine.strokes[6][0],
                end: Engine.strokes[6][Engine.strokes[6].length - 1]
            }
        };
    })()`);
    console.log(JSON.stringify(s3, null, 2));

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
