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

    const demoCheck = await evalJs(`
        (function() {
            Engine.loadText('획순');
            const g = Engine.glyphData;
            
            // Check that g.key is strictly monotonically increasing
            let monoOrder = true;
            for (let i = 1; i < g.key.length; i++) {
                if (g.key[i] < g.key[i - 1]) {
                    monoOrder = false;
                    break;
                }
            }
            
            // For each stroke sid, check the range of keys
            const strokeKeyRanges = {};
            for (let i = 0; i < g.key.length; i++) {
                const s = g.sid[i];
                if (!strokeKeyRanges[s]) strokeKeyRanges[s] = { minKey: g.key[i], maxKey: g.key[i], count: 1 };
                else {
                    strokeKeyRanges[s].maxKey = g.key[i];
                    strokeKeyRanges[s].count++;
                }
            }
            
            return {
                totalKeys: g.key.length,
                monoOrder,
                strokeKeyRanges,
                nStrokes: Engine.strokes.length
            };
        })()
    `);

    console.log('Demo Key Sequence Verification for 획순:');
    console.log('Total pixels:', demoCheck.totalKeys, 'Monotonically ordered:', demoCheck.monoOrder);
    for (let s = 0; s < demoCheck.nStrokes; s++) {
        const r = demoCheck.strokeKeyRanges[s];
        console.log(`Stroke ${s+1}: minKey=${r.minKey} (${s}*4096+${r.minKey%4096}), maxKey=${r.maxKey} (${s}*4096+${r.maxKey%4096}), count=${r.count}`);
    }

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
