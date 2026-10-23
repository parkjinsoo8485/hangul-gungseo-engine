const { spawn } = require('child_process'), http = require('http');
const targetChar = process.argv[2] || '꾄';
const PORT = 9920;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_diag_file_' + PORT,
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
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;
        Engine.loadText(${JSON.stringify(targetChar)});
        const S = Engine.strokes.length;
        const g = Engine.glyphData;
        const areas = new Array(S).fill(0);
        let dynB = null;
        if (g) {
            for (let i = 0; i < g.idx.length; i++) {
                if (g.sid[i] < S) areas[g.sid[i]]++;
            }
            const info = Engine.charsInfo[0];
            const cv = document.createElement('canvas'); cv.width = 360; cv.height = 360;
            const ctx = cv.getContext('2d'); ctx.font = 'normal ' + Math.round(360 * 0.81) + 'px ' + Engine.styleParams.fontFamily;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(${JSON.stringify(targetChar)}, 180, 180);
            const img = ctx.getImageData(0, 0, 360, 360).data;
            dynB = computeDynamicJamoBounds(img, 0, 1, 360, info, VOWEL_TYPE[info.jung] || 'V', !!info.jong);
        }
        return {
            char: ${JSON.stringify(targetChar)},
            dynB,
            fbox0: Engine.jamoEntries[0].fbox,
            raw0: Engine.rawCharStrokes[0][0],
            entries: Engine.jamoEntries.map(e => ({
                char: e.char,
                whId: e.whId,
                part: e.part,
                vType: e.vType,
                box: e.fbox || e.box
            })),
            strokes: Engine.strokes.map((st, i) => ({
                i,
                meta: Engine.strokeMeta[i],
                area: areas[i],
                firstPt: st[0],
                lastPt: st[st.length - 1],
                len: st.length
            }))
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
