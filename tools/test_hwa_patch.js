const { spawn } = require('child_process'), http = require('http');
const PORT = 9958;
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

    const testRes = await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;

        // Monkey-patch computeDynamicJamoBounds to use true choYTop
        const oldCompute = computeDynamicJamoBounds;
        computeDynamicJamoBounds = function(img, ci, count, R, info, vType, hasJong) {
            const b = oldCompute(img, ci, count, R, info, vType, hasJong);
            if (!b) return b;
            const W = R * count;
            if (vType === 'C' || vType === 'V') {
                const yLimit = (vType === 'C') ? b.choY2 : (hasJong ? b.choY2 : b.maxY);
                let choYTop = R;
                for (let y = b.minY; y <= yLimit; y++) {
                    for (let x = b.minX; x <= b.splitX; x++) {
                        if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                            if (y < choYTop) { choYTop = y; break; }
                        }
                    }
                    if (choYTop < R) break;
                }
                b.choY1 = choYTop < R ? choYTop : b.minY;
            }
            return b;
        };

        Engine.loadText('화');
        const g = Engine.glyphData;
        const counts = {};
        for (let k = 0; k < Engine.strokes.length; k++) counts[k] = 0;
        for (let i = 0; i < g.idx.length; i++) counts[g.sid[i]]++;
        return counts;
    })()`);

    console.log('화 counts with choYTop patch:', testRes);
    ws.close(); chrome.kill(); process.exit(0);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
