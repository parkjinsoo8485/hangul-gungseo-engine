const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9992;
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

            const chos = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
            const jungs = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
            const doubleJungs = ['ㅐ','ㅒ','ㅔ','ㅖ'];
            const out = {};

            for (const j of doubleJungs) {
                out[j] = [];
                for (const c of chos) {
                    const code = 0xAC00 + (chos.indexOf(c) * 21 + jungs.indexOf(j)) * 28;
                    const ch = String.fromCharCode(code);
                    ctx.clearRect(0, 0, R, R);
                    ctx.fillText(ch, R / 2, R / 2);
                    const img = ctx.getImageData(0, 0, R, R).data;

                    // Compute colSum for x from 35% to 75%
                    let minY = R, maxY = 0, minX = R, maxX = 0;
                    for (let y = 0; y < R; y++) {
                        for (let x = 0; x < R; x++) {
                            if (img[(y * R + x) * 4 + 3] > 50) {
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                if (y > maxY) maxY = y;
                            }
                        }
                    }
                    const cols = [];
                    for (let xp = 35; xp <= 75; xp++) {
                        const x = Math.round(xp * R / 100);
                        let sum = 0;
                        for (let y = minY; y <= maxY; y++) {
                            if (img[(y * R + x) * 4 + 3] > 50) sum++;
                        }
                        cols.push({ xp, sum });
                    }
                    // Find peaks (vertical stems) in [48%, 74%]
                    out[j].push({ ch, c, minX: Number((minX*100/R).toFixed(1)), maxX: Number((maxX*100/R).toFixed(1)), cols: cols.map(o => o.xp + ':' + o.sum).join(' ') });
                }
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    for (const j of ['ㅔ', 'ㅖ']) {
        console.log(`=== ${j} ===`);
        for (const row of data[j]) {
            console.log(`${row.ch} (${row.c}) [${row.minX}..${row.maxX}]: ${row.cols}`);
        }
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
