const http = require('http');
const PORT = 9980;
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,950',
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_we_' + PORT, 'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    const res = await evalJs(`(() => {
        const R = 150;
        const ff = Engine.styleParams.fontFamily;
        const canvas = document.createElement('canvas');
        canvas.width = R; canvas.height = R;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
        ctx.fillText('웨', R / 2, R / 2);
        const d = ctx.getImageData(0, 0, R, R).data;

        const info = decomposeHangul('웨');
        const jb = computeDynamicJamoBounds(d, 0, 1, R, info, 'C', false);
        return { jb };
    })()`);
    console.log(JSON.stringify(res, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
}
run();
