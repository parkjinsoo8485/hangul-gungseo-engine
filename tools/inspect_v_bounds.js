const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9991;
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
            const vJungs = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅣ'];

            const out = [];
            for (const c of chos) {
                for (const j of vJungs) {
                    for (const jongIdx of [0, 1]) { // 0: no jong, 1: ㄱ jong
                        const code = 0xAC00 + (chos.indexOf(c) * 21 + jungs.indexOf(j)) * 28 + jongIdx;
                        const ch = String.fromCharCode(code);
                        ctx.clearRect(0, 0, R, R);
                        ctx.fillText(ch, R / 2, R / 2);
                        const img = ctx.getImageData(0, 0, R, R).data;
                        const jb = computeDynamicJamoBounds(img, 0, 1, R, { cho: c, jung: j, jong: jongIdx ? 'ㄱ' : '' }, 'V', !!jongIdx);

                        // Measure actual cho left/right ink in [minX, jb.splitX - 2] and [minY, yUpperEnd]
                        const yUpperEnd = jongIdx ? jb.choY2 : jb.maxY;
                        let choX1 = R, choX2 = 0;
                        // Wait: if j is ㅓ, ㅔ, ㅕ, ㅖ, does the vowel tick cross jb.splitX?
                        // Let's check what jb.splitX is right now!
                        for (let y = jb.minY; y <= yUpperEnd; y++) {
                            for (let x = jb.minX; x <= jb.splitX - 2; x++) {
                                if (img[(y * R + x) * 4 + 3] > 50) {
                                    if (x < choX1) choX1 = x;
                                    if (x > choX2) choX2 = x;
                                }
                            }
                        }
                        out.push({
                            ch, c, j, hasJong: !!jongIdx,
                            minX: Number((jb.minX * 100 / R).toFixed(1)),
                            splitX: Number((jb.splitX * 100 / R).toFixed(1)),
                            stemX_V: Number((jb.stemX_V * 100 / R).toFixed(1)),
                            choX1: Number((choX1 * 100 / R).toFixed(1)),
                            choX2: Number((choX2 * 100 / R).toFixed(1))
                        });
                    }
                }
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    console.log('=== ㅇ with V vowels ===');
    for (const d of data.filter(x => x.c === 'ㅇ')) {
        console.log(`${d.ch} (j=${d.j}, jong=${d.hasJong}): minX=${d.minX}, choX1=${d.choX1}, choX2=${d.choX2}, splitX=${d.splitX}, stemX_V=${d.stemX_V}`);
    }
    console.log('=== ㅖ with all chos (no jong) ===');
    for (const d of data.filter(x => x.j === 'ㅖ' && !x.hasJong)) {
        console.log(`${d.ch} (${d.c}): minX=${d.minX}, choX1=${d.choX1}, choX2=${d.choX2}, splitX=${d.splitX}, stemX_V=${d.stemX_V}`);
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
