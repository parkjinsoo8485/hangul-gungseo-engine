const { spawn } = require('child_process'), http = require('http');
const PORT = 9980;
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 50; i++) {
        try {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
        } catch (e) { }
        await sleep(200);
    }

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const R = 360;
            const ff = Engine.styleParams.fontFamily;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;

            // Check 약
            ctx.clearRect(0, 0, R, R);
            ctx.fillText('약', R / 2, R / 2);
            let img = ctx.getImageData(0, 0, R, R).data;
            const yakRows = [];
            for (let y = 40; y <= 230; y += 2) {
                let run = 0;
                for (let x = Math.round(73 * R / 100); x <= Math.round(88 * R / 100); x++) {
                    if (img[(y * R + x) * 4 + 3] > 80) run++; else break;
                }
                if (run > 0) yakRows.push({ yp: Number((y * 100 / R).toFixed(1)), run });
            }

            // Check 왝
            ctx.clearRect(0, 0, R, R);
            ctx.fillText('왝', R / 2, R / 2);
            img = ctx.getImageData(0, 0, R, R).data;
            const waekRows = [];
            for (let y = 40; y <= 230; y += 2) {
                let run = 0;
                for (let x = Math.round(57 * R / 100); x <= Math.round(64 * R / 100); x++) {
                    if (img[(y * R + x) * 4 + 3] > 80) run++;
                }
                if (run > 0) waekRows.push({ yp: Number((y * 100 / R).toFixed(1)), run });
            }
            return JSON.stringify({ yakRows, waekRows });
        })()`,
        returnByValue: true
    });

    console.log(res.result.value);
    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
