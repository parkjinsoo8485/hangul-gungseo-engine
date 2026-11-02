const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9988;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) { }
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
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 50; i++) {
        try {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
        } catch (e) { }
        await sleep(250);
    }

    const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

    const data = await evalJs(`(() => {
        Engine.loadText('닮');
        const g = Engine.glyphData;
        const R = g.R, W = g.W;
        
        // Print ASCII art of ink around Y = 38% to 52% (y = 135 to 190) and X = 15% to 85% (x = 54 to 306)
        const lines = [];
        for (let y = Math.round(R * 0.38); y <= Math.round(R * 0.52); y += 2) {
            let row = y.toString().padStart(3) + ' ';
            for (let x = Math.round(R * 0.20); x <= Math.round(R * 0.82); x += 2) {
                const idx = g.idx.indexOf(y * W + x);
                const a = idx >= 0 ? g.a[idx] : 0;
                row += a > 128 ? '#' : a > 30 ? '.' : ' ';
            }
            lines.push(row);
        }

        // Also check keys assigned to each pixel in this region
        const strokeAt = [];
        for (let y = Math.round(R * 0.40); y <= Math.round(R * 0.50); y += 4) {
            let row = y.toString().padStart(3) + ' ';
            for (let x = Math.round(R * 0.20); x <= Math.round(R * 0.82); x += 4) {
                const idx = g.idx.indexOf(y * W + x);
                if (idx >= 0) {
                    const s = Math.floor(g.key[idx] / 4096);
                    row += (s + 1);
                } else {
                    row += ' ';
                }
            }
            strokeAt.push(row);
        }

        return { lines, strokeAt };
    })()`);

    console.log('=== GLYPH INK ===');
    console.log(data.lines.join('\n'));
    console.log('\n=== STROKE ASSIGNMENT (KEY) ===');
    console.log(data.strokeAt.join('\n'));

    ws.close();
    chrome.kill();
}
main().catch(console.error);
