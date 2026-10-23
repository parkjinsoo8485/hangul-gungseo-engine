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
            function findEu(ch) {
                const cv = document.createElement('canvas');
                cv.width = 100; cv.height = 100;
                const ctx = cv.getContext('2d');
                ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.font = "normal 81px '궁서', 'Gungsuh', serif";
                ctx.fillText(ch, 50, 50);
                const img = ctx.getImageData(0, 0, 100, 100).data;
                const slices = [];
                for (let y = 50; y <= 85; y++) {
                    const xs = [];
                    for (let x = 0; x < 100; x++) {
                        if (img[(y * 100 + x) * 4 + 3] > 80) xs.push(x);
                    }
                    if (xs.length > 30) slices.push({ y, minX: Math.min(...xs), maxX: Math.max(...xs), count: xs.length });
                }
                return slices;
            }
            return {
                deu: findEu('드'),
                zeu: findEu('즈'),
                teu: findEu('트'),
                geu: findEu('그')
            };
        })()
    `);

    Object.entries(data).forEach(([k, slices]) => {
        console.log(`\n=== Character ${k} (horizontal bar) ===`);
        slices.forEach(s => console.log(` y=${s.y}: x=[${s.minX}..${s.maxX}] count=${s.count}`));
    });

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
