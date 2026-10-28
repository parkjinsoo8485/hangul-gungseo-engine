const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9997;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_insp_' + PORT, 'about:blank'
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

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    const res = await evalJs(`(() => {
        Engine.loadText('획순');
        Engine.stopDemo();
        Engine.currentStroke = Engine.strokes.length;
        Engine.currentStep = 9999;
        Engine.renderGlyphInk();
        Engine.renderScene();

        return {
            charCount: Engine.charCount,
            entries: Engine.jamoEntries.map((e, idx) => ({
                idx,
                part: e.part,
                subPart: e.subPart,
                whId: e.whId,
                box: e.box.map(v => Math.round(v*10)/10),
                fbox: e.fbox ? e.fbox.map(v => Math.round(v*10)/10) : null,
                so: e.so ? e.so.map(p => p.map(v => Math.round(v*10)/10)) : null
            })),
            badges: (Engine.badgePositions || []).map((b, idx) => ({
                idx,
                sx: Math.round(b.sx*10)/10,
                sy: Math.round(b.sy*10)/10,
                bx: Math.round(b.bx*10)/10,
                by: Math.round(b.by*10)/10,
                dist: Math.round(Math.hypot(b.bx - b.sx, b.by - b.sy)*10)/10
            })),
            strokes: Engine.strokes.map((st, i) => ({
                idx: i,
                p0: st[0].map(v => Math.round(v*10)/10),
                pMid: st[Math.floor(st.length/2)].map(v => Math.round(v*10)/10),
                pLast: st[st.length - 1].map(v => Math.round(v*10)/10),
                len: st.length
            }))
        };
    })()`);

    console.log(JSON.stringify(res, null, 2));
    ws.close();
    chrome.kill();
})();
