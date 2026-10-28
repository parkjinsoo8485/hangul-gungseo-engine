const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9982;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_diag_' + PORT, 'about:blank'
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

    const checkWord = async (char) => {
        return (await send('Runtime.evaluate', {
            expression: `(() => {
                Engine.loadText('${char}');
                const g = Engine.glyphData;
                const strokes = Engine.strokes;
                const entries = Engine.jamoEntries;
                const stats = strokes.map((s, idx) => {
                    let pxCount = 0;
                    for (let i = 0; i < g.idx.length; i++) {
                        if (g.sid[i] === idx) pxCount++;
                    }
                    return {
                        idx,
                        len: s.length,
                        start: [s[0][0].toFixed(1), s[0][1].toFixed(1)],
                        end: [s[s.length-1][0].toFixed(1), s[s.length-1][1].toFixed(1)],
                        pxCount
                    };
                });
                return { char: '${char}', entries: entries.map(e => ({ whId: e.whId, part: e.part, fbox: e.fbox })), stats };
            })()`,
            returnByValue: true
        })).result.value;
    };

    console.log('ANJ:', JSON.stringify(await checkWord('앉'), null, 2));
    console.log('BOOL:', JSON.stringify(await checkWord('불'), null, 2));
    console.log('DDANG:', JSON.stringify(await checkWord('땅'), null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
