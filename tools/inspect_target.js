const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9979;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) { }
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
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 50; i++) {
        try {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
        } catch (e) { }
        await sleep(250);
    }

    const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

    const data = await evalJs(`(() => {
        Engine.loadText('쵁');
        const g = Engine.glyphData;
        const R = g.R, W = g.W;
        // Search columns between stem 1 and stem 2
        // What is at column x = 216?
        const rows = [];
        for (let y = 0; y < R; y++) {
            const idx = g.idx.indexOf(y * W + 216);
            if (idx >= 0 && g.a[idx] > 20) rows.push({ y, yPct: (y*100/R).toFixed(1), alpha: g.a[idx] });
        }

        // Also check where all strokes of 쵁 are:
        const strokes = Engine.strokes.map((st, i) => ({
            i: i+1,
            whId: Engine.strokeMeta[i] && Engine.strokeMeta[i].whId,
            p0: [st[0][0].toFixed(1), st[0][1].toFixed(1)],
            pEnd: [st[st.length-1][0].toFixed(1), st[st.length-1][1].toFixed(1)]
        }));

        return { rows, strokes };
    })()`);
    console.log(JSON.stringify(data, null, 2));

    ws.close();
    chrome.kill();
}
main().catch(console.error);
