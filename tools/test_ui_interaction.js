const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9985;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_hoe_' + PORT, 'about:blank'
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
    await sleep(2500);

    const check = await send('Runtime.evaluate', {
        expression: `(() => {
            const input = document.getElementById('char-input');
            const initialVal = input.value;
            input.value = '회의';
            Engine.loadText('회의');
            
            // Check stroke 4 (5th stroke, ㅗ 가로선)
            const s4 = Engine.strokes[4];
            const s4_start = s4[0];
            const s4_end = s4[s4.length - 1];

            // Check stroke 5 (6th stroke, ㅣ 세로선)
            const s5 = Engine.strokes[5];
            const s5_start = s5[0];

            // Check jamo entries
            const e1 = Engine.jamoEntries[1]; // jung_h of 회
            const fbox = e1.fbox;

            return {
                initialVal,
                currentInput: input.value,
                s4_start: [s4_start[0].toFixed(1), s4_start[1].toFixed(1)],
                s4_end: [s4_end[0].toFixed(1), s4_end[1].toFixed(1)],
                s5_start: [s5_start[0].toFixed(1), s5_start[1].toFixed(1)],
                fbox: fbox.map(v => v.toFixed(1))
            };
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(check.result.value, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
