const { spawn } = require('child_process'), http = require('http');
const PORT = 9922;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_diag_pts_' + PORT,
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
        const s0 = Engine.strokes[0];
        const s1 = Engine.strokes[1];
        const s2 = Engine.strokes[2];
        const s3 = Engine.strokes[3];
        return {
            s0_box: [Math.min(...s0.map(p=>p[0])), Math.min(...s0.map(p=>p[1])), Math.max(...s0.map(p=>p[0])), Math.max(...s0.map(p=>p[1]))],
            s1_box: [Math.min(...s1.map(p=>p[0])), Math.min(...s1.map(p=>p[1])), Math.max(...s1.map(p=>p[0])), Math.max(...s1.map(p=>p[1]))],
            s2_box: [Math.min(...s2.map(p=>p[0])), Math.min(...s2.map(p=>p[1])), Math.max(...s2.map(p=>p[0])), Math.max(...s2.map(p=>p[1]))],
            s3_box: [Math.min(...s3.map(p=>p[0])), Math.min(...s3.map(p=>p[1])), Math.max(...s3.map(p=>p[0])), Math.max(...s3.map(p=>p[1]))],
            s1_last: s1[s1.length-1],
            s2_first: s2[0]
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
