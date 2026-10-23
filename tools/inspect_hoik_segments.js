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

    const details = await evalJs(`
        (function() {
            const cv = document.createElement('canvas');
            cv.width = 100;
            cv.height = 100;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal 81px "궁서", "Gungsuh", serif';
            ctx.fillText('획', 50, 50);
            const img = ctx.getImageData(0, 0, 100, 100).data;
            
            // For each y from 10 to 90, find contiguous segments of ink
            const rowSegments = [];
            for (let y = 10; y <= 90; y++) {
                let segs = [];
                let inSeg = false, start = 0;
                for (let x = 0; x < 100; x++) {
                    const isInk = img[(y * 100 + x) * 4 + 3] > 80;
                    if (isInk && !inSeg) { inSeg = true; start = x; }
                    else if (!isInk && inSeg) { inSeg = false; segs.push([start, x - 1]); }
                }
                if (inSeg) segs.push([start, 99]);
                if (segs.length) rowSegments.push({ y, segs });
            }
            return rowSegments;
        })()
    `);

    console.log('Ink Segments for 획:');
    details.forEach(r => {
        const str = r.segs.map(([s, e]) => `[${s}..${e} (w=${e-s+1})]`).join(' ');
        console.log(`y=${r.y.toString().padStart(2, ' ')}: ${str}`);
    });

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
