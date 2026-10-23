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

    const ownership = await evalJs(`
        (function() {
            Engine.loadText('획');
            const g = Engine.glyphData;
            // Count pixels owned by each stroke
            const counts = {};
            for (let i = 0; i < g.sid.length; i++) {
                const s = g.sid[i];
                counts[s] = (counts[s] || 0) + 1;
            }
            // For stroke 4 (index 4 = 5th stroke), find bounding box of owned pixels
            const strokeBoxes = {};
            for (let i = 0; i < g.sid.length; i++) {
                const s = g.sid[i];
                const p = g.idx[i], x = p % g.W, y = (p / g.W) | 0;
                if (!strokeBoxes[s]) strokeBoxes[s] = { minX: x, maxX: x, minY: y, maxY: y };
                else {
                    const b = strokeBoxes[s];
                    if (x < b.minX) b.minX = x; if (x > b.maxX) b.maxX = x;
                    if (y < b.minY) b.minY = y; if (y > b.maxY) b.maxY = y;
                }
            }
            return { counts, strokeBoxes, R: g.R };
        })()
    `);

    console.log('Stroke Pixel Counts and Pixel Bounding Boxes for 획 (scale R=' + ownership.R + '):');
    Object.keys(ownership.counts).forEach(s => {
        const b = ownership.strokeBoxes[s];
        const sNorm = {
            minX: (b.minX / ownership.R * 100).toFixed(1),
            maxX: (b.maxX / ownership.R * 100).toFixed(1),
            minY: (b.minY / ownership.R * 100).toFixed(1),
            maxY: (b.maxY / ownership.R * 100).toFixed(1)
        };
        console.log(`Stroke ${parseInt(s)+1}: count=${ownership.counts[s]} pixels, y=[${sNorm.minY}..${sNorm.maxY}], x=[${sNorm.minX}..${sNorm.maxX}]`);
    });

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
