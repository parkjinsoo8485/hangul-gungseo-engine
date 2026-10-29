const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9995;
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
        await sleep(200);
    }

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const R = 360;
            const ff = Engine.styleParams.fontFamily;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;

            const analyzeChar = (ch) => {
                ctx.clearRect(0, 0, R, R);
                ctx.fillText(ch, R / 2, R / 2);
                const img = ctx.getImageData(0, 0, R, R).data;
                const alpha = (x, y) => img[(Math.round(y) * R + Math.round(x)) * 4 + 3];

                // Print ASCII map of the glyph at 2% steps
                const rows = [];
                for (let yp = 10; yp <= 88; yp += 2) {
                    let line = String(yp).padStart(2, ' ') + '%: ';
                    for (let xp = 8; xp <= 80; xp += 1) {
                        const a = alpha(xp * R / 100, yp * R / 100);
                        line += a > 128 ? '#' : (a > 40 ? '.' : ' ');
                    }
                    rows.push(line);
                }
                return rows.join('\\n');
            };

            return JSON.stringify({
                ye: analyzeChar('예'),
                e: analyzeChar('에'),
                gye: analyzeChar('계'),
                hye: analyzeChar('혜')
            });
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    console.log('=== 예 GLYPH ASCII (X: 8% to 80%) ===');
    console.log('     ' + Array.from({length: 73}, (_, i) => ((i + 8) % 10 === 0 ? String((i + 8) / 10) : ' ')).join(''));
    console.log('     ' + Array.from({length: 73}, (_, i) => String((i + 8) % 10)).join(''));
    console.log(data.ye);

    console.log('=== 에 GLYPH ASCII (X: 8% to 80%) ===');
    console.log(data.e);

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
