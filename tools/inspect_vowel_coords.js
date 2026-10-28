const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9978;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_vowels_' + PORT, 'about:blank'
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

    const checkWord = async (text) => {
        return (await send('Runtime.evaluate', {
            expression: `(() => {
                Engine.loadText('${text}');
                const strokes = Engine.strokes.map((s, idx) => ({
                    idx: idx + 1,
                    start: [s[0][0].toFixed(1), s[0][1].toFixed(1)],
                    end: [s[s.length-1][0].toFixed(1), s[s.length-1][1].toFixed(1)],
                    len: s.length
                }));
                const entries = Engine.jamoEntries.map((e, idx) => ({
                    idx: idx + 1,
                    whId: e.whId,
                    part: e.part,
                    fbox: e.fbox ? e.fbox.map(v => v.toFixed(1)) : null
                }));
                const badges = Engine.badgePositions.map((b, idx) => ({
                    idx: idx + 1,
                    sx: b.sx.toFixed(1),
                    sy: b.sy.toFixed(1),
                    bx: b.bx.toFixed(1),
                    by: b.by.toFixed(1)
                }));
                return { text: '${text}', strokes, entries, badges };
            })()`,
            returnByValue: true
        })).result.value;
    };

    console.log('에:', JSON.stringify(await checkWord('에'), null, 2));
    console.log('애:', JSON.stringify(await checkWord('애'), null, 2));
    console.log('예:', JSON.stringify(await checkWord('예'), null, 2));
    console.log('얘:', JSON.stringify(await checkWord('얘'), null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
