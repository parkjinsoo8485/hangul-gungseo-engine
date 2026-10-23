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
            Engine.loadText('획순');
            return {
                strokeMeta: Engine.strokeMeta,
                badges: Engine.badgePositions,
                strokes: Engine.strokes.map((pts, idx) => ({
                    idx,
                    start: pts[0],
                    mid: pts[Math.floor(pts.length / 2)],
                    end: pts[pts.length - 1],
                    count: pts.length
                }))
            };
        })()
    `);

    console.log('Strokes in 획순:');
    details.strokes.forEach((s, idx) => {
        const meta = details.strokeMeta[idx] || {};
        const b = details.badges ? details.badges[idx] : null;
        console.log(`Stroke ${idx + 1}: ci=${meta.ci} part=${meta.part} subPart=${meta.subPart}`);
        console.log(`   start: [${s.start[0].toFixed(1)}, ${s.start[1].toFixed(1)}]`);
        console.log(`   mid:   [${s.mid[0].toFixed(1)}, ${s.mid[1].toFixed(1)}]`);
        console.log(`   end:   [${s.end[0].toFixed(1)}, ${s.end[1].toFixed(1)}]`);
        if (b) {
            console.log(`   badge: [${b.bx.toFixed(1)}, ${b.by.toFixed(1)}] (sx=${b.sx.toFixed(1)}, sy=${b.sy.toFixed(1)})`);
        }
    });

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
