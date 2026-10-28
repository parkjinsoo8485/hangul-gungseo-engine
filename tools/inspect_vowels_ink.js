const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9976;
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
    await sleep(3000);

    const evalCode = async (expr) => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
        return r.result.value;
    };

    const res = await evalCode(`(() => {
        Engine.loadText('체');
        const img = Engine.glyphImgData;
        const W = Engine.glyphW, H = Engine.glyphH;
        // Let's find ink on the right half (jung) around y = 40% to 50%
        const yMid = Math.floor(H * 0.46);
        const row = [];
        for (let x = 0; x < W; x++) {
            const a = img.data[(yMid * W + x) * 4 + 3];
            row.push(a > 50 ? '#' : '.');
        }
        
        // Also let's inspect the strokes of '체'
        const strokes = Engine.strokes.map((s, i) => ({
            i: i + 1,
            start: [s[0][0].toFixed(1), s[0][1].toFixed(1)],
            end: [s[s.length-1][0].toFixed(1), s[s.length-1][1].toFixed(1)],
            len: s.length
        }));

        const jb = Engine.cachedDynBounds ? Engine.cachedDynBounds[0] : null;

        return {
            row: row.join(''),
            strokes,
            jb
        };
    })()`);

    console.log('Strokes of 체:', JSON.stringify(res.strokes, null, 2));
    console.log('Row at y=46% of 체:');
    // Group row into chunks of 50
    for (let i = 0; i < res.row.length; i += 60) {
        console.log(i + ': ' + res.row.slice(i, i + 60));
    }

    ws.close(); chrome.kill(); process.exit(0);
})();
