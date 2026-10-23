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
            function inspectGlyph(ch) {
                const cv = document.createElement('canvas');
                cv.width = 100; cv.height = 100;
                const ctx = cv.getContext('2d');
                ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.font = "normal 81px '궁서', 'Gungsuh', serif";
                ctx.fillText(ch, 50, 50);
                const img = ctx.getImageData(0, 0, 100, 100).data;
                const rows = [];
                for (let y = 10; y <= 90; y++) {
                    const xs = [];
                    for (let x = 0; x < 100; x++) {
                        if (img[(y * 100 + x) * 4 + 3] > 80) xs.push(x);
                    }
                    if (xs.length) rows.push({ y, minX: Math.min(...xs), maxX: Math.max(...xs), midX: (Math.min(...xs) + Math.max(...xs))/2 });
                }
                return rows;
            }
            return {
                u: inspectGlyph('우'),
                su: inspectGlyph('수'),
                soon: inspectGlyph('순'),
                mun: inspectGlyph('문'),
                gun: inspectGlyph('군')
            };
        })()
    `);

    ['우', '수', '순', '문', '군'].forEach(k => {
        const key = k === '우' ? 'u' : k === '수' ? 'su' : k === '순' ? 'soon' : k === '문' ? 'mun' : 'gun';
        const rows = data[key];
        // Stem rows are below the horizontal bar
        const stemRows = rows.filter(r => r.y >= 55 && r.y <= 65);
        console.log(`\n=== Character [${k}] Stem Rows (y=55..65) ===`);
        stemRows.forEach(r => {
            console.log(`y=${r.y}: x=[${r.minX}..${r.maxX}] width=${r.maxX-r.minX+1} center=${r.midX.toFixed(1)}`);
        });
    });

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
