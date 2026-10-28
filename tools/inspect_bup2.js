const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9985;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_bup_' + PORT, 'about:blank'
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
    await sleep(3500);

    const evalCode = async (expr) => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
        return r.result.value;
    };

    const res = await evalCode(`(() => {
        Engine.loadText('법');
        const g = Engine.glyphData;
        const counts = {};
        for (let i = 0; i < g.sid.length; i++) {
            counts[g.sid[i]] = (counts[g.sid[i]] || 0) + 1;
        }
        const s6 = Engine.strokes[6]; const s7 = Engine.strokes[7];
        const eJong = Engine.jamoEntries.find(e => e.part === 'jong');
        return {
            counts,
            s6: [s6[0], s6[s6.length-1]], s7: [s7[0], s7[s7.length-1]],
            jongFbox: eJong ? eJong.fbox : null,
            jongDef: eJong ? eJong.def : null
        };
    })()`);

    console.log('Bup debug:', JSON.stringify(res, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
