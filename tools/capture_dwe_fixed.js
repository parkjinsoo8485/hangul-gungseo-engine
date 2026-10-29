const http = require('http');
const PORT = 9998;
const fs = require('fs');
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_dwe_after_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { }
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 30; i++) {
        const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
        if (chk.result && chk.result.value) break;
        await sleep(300);
    }

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    const res = await evalJs(`(() => {
        Engine.loadText('되');
        const e0 = Engine.jamoEntries[0];
        const e1 = Engine.jamoEntries[1];
        const e2 = Engine.jamoEntries[2];
        return {
            e0_fbox: e0.fbox,
            e1_fbox: e1.fbox,
            e2_fbox: e2.fbox,
            strokes: Engine.strokes.map(s => [Math.round(s[0][0]), Math.round(s[0][1]), Math.round(s[s.length-1][0]), Math.round(s[s.length-1][1])])
        };
    })()`);
    console.log(JSON.stringify(res, null, 2));

    const ss = await send('Page.captureScreenshot', { format: 'png' });
    const dest = 'C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e';
    fs.writeFileSync(dest + '/render_dwe_fixed.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved screenshot to render_dwe_fixed.png');

    ws.close(); chrome.kill(); process.exit(0);
}
run();
