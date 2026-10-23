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
            Engine.loadText('궁');
            return {
                strokes: Engine.strokes.map((pts, i) => ({
                    idx: i,
                    start: pts[0],
                    mid: pts[Math.floor(pts.length/2)],
                    end: pts[pts.length - 1],
                    badge: Engine.badgePositions ? Engine.badgePositions[i] : null
                })),
                jamoEntries: Engine.jamoEntries.map(e => ({
                    part: e.part, whId: e.whId, box: e.box, fbox: e.fbox
                }))
            };
        })()
    `);

    console.log('Details of 궁 in engine:');
    console.log('Jamo Entries:', details.jamoEntries);
    console.log('Strokes:');
    details.strokes.forEach(s => {
        console.log(`Stroke ${s.idx + 1}: start=[${s.start[0].toFixed(1)}, ${s.start[1].toFixed(1)}], end=[${s.end[0].toFixed(1)}, ${s.end[1].toFixed(1)}], badge=[${s.badge.bx.toFixed(1)}, ${s.badge.by.toFixed(1)}]`);
    });

    const clip = await evalJs(`
        (function() {
            const c = document.getElementById('main-canvas');
            const r = c.getBoundingClientRect();
            return { x: r.left, y: r.top, width: r.width, height: r.height, scale: 1 };
        })()
    `);
    const shot = await send('Page.captureScreenshot', { clip });
    fs.writeFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/scratch/current_gung.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved current_gung.png');

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
