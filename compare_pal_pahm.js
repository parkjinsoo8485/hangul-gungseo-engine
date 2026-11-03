const http = require('http');
const PORT = 9998;
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_' + PORT,
    'about:blank'
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await new Promise((res, rej) => http.get('http://127.0.0.1:' + PORT + '/json/list', r => {
            let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
        }).on('error', rej))); if (list && list.length) break; } catch (e) { }
        await sleep(250);
    }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => {
            const r = JSON.parse(data);
            if (r.id === reqId) { ws.removeEventListener('message', onMsg); if (r.error) rej(r.error); else res(r.result); }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 50; i++) {
        try {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
        } catch (e) { }
        await sleep(250);
    }

    const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

    const res = await evalJs(`(() => {
        Engine.loadText('팔');
        const bPal = { ...Engine.dynBounds[0] };
        const stPal = Engine.strokes[3];
        const endPal = stPal[stPal.length - 1];

        Engine.loadText('팜');
        const bPahm = { ...Engine.dynBounds[0] };
        const stPahm = Engine.strokes[3];
        const endPahm = stPahm[stPahm.length - 1];

        return {
            pal: { bounds: bPal, end: endPal },
            pahm: { bounds: bPahm, end: endPahm }
        };
    })()`);

    console.log(JSON.stringify(res, null, 2));
    ws.close();
    try { chrome.kill(); } catch (e) {}
}

main().catch(console.error);
