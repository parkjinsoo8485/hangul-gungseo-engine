const { spawn } = require('child_process'), http = require('http');
const PORT = 9988;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_' + PORT, 'about:blank'
], { stdio: 'ignore' });
const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    let list;
    for (let i = 0; i < 40; i++) { try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) { } await sleep(250); }
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
    for (let i = 0; i < 40; i++) {
        try {
            const c = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (c.result && c.result.value) break;
        } catch (e) {}
        await sleep(200);
    }
    const r = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `['가', '바', '빠', '하', '호', '토', 'ㄱ', 'ㅂ'].map(ch => {
            Engine.loadText(ch);
            const jb = Engine.dynBounds[0];
            const eCho = Engine.jamoEntries.find(e => e.part === 'cho' || e.part === 'single');
            const strokes = Engine.strokes.filter((_, s) => Engine.strokeMeta[s].part === 'cho' || Engine.strokeMeta[s].part === 'single');
            const stMinY = Math.min(...strokes.flat().map(p => p[1]));
            const stMaxY = Math.max(...strokes.flat().map(p => p[1]));
            const stMinX = Math.min(...strokes.flat().map(p => p[0]));
            const stMaxX = Math.max(...strokes.flat().map(p => p[0]));
            return {
                ch,
                jb: jb ? { choX1: jb.choX1, choX2: jb.choX2, splitX: jb.splitX, choY1: jb.choY1, choY2: jb.choY2, minY: jb.minY, maxY: jb.maxY } : null,
                fbox: eCho ? eCho.fbox.map(v => +v.toFixed(1)) : null,
                wbox: eCho ? eCho.box.map(v => +v.toFixed(1)) : null,
                strokeSpanY: [+stMinY.toFixed(1), +stMaxY.toFixed(1)],
                strokeSpanX: [+stMinX.toFixed(1), +stMaxX.toFixed(1)]
            };
        })`
    });
    console.log(JSON.stringify(r.result.value, null, 2));
    ws.close(); chrome.kill();
})();
