const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9951;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
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
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1500);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        return r.result.value;
    };

    const data = await evalJs(`
        (function() {
            Engine.loadText('형');
            const e0 = Engine.jamoEntries[0];
            const s0 = Engine.strokes[0];
            
            // Measure where the top dot of ㅎ is in the ink of 형
            const cv = document.createElement('canvas');
            cv.width = 100; cv.height = 100;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'normal 81px "궁서", "Gungsuh", serif';
            ctx.fillText('형', 50, 50);
            const img = ctx.getImageData(0, 0, 100, 100).data;
            const dotInk = [];
            for (let y = 10; y <= 30; y++) {
                for (let x = 10; x <= 50; x++) {
                    if (img[(y * 100 + x) * 4 + 3] > 80) dotInk.push([x, y]);
                }
            }

            return {
                e0_box: e0.box,
                e0_fbox: e0.fbox,
                s0_start: s0[0],
                s0_end: s0[s0.length - 1],
                dotInkMinX: Math.min(...dotInk.map(p => p[0])),
                dotInkMaxX: Math.max(...dotInk.map(p => p[0])),
                dotInkMinY: Math.min(...dotInk.map(p => p[1])),
                dotInkMaxY: Math.max(...dotInk.map(p => p[1]))
            };
        })()
    `);

    console.log('형 Cho_ㅎ and stroke 0 details:');
    console.log(data);

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
