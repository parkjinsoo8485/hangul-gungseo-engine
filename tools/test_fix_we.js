const http = require('http');
const PORT = 9980;
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,950',
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_we_' + PORT, 'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
    let list;
    for (let i = 0; i < 40; i++) { try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { } await sleep(250); }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r.result); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    const res = await evalJs(`(() => {
        // Test with updated bounds and fitting logic in evaluate
        const origBounds = computeDynamicJamoBounds;
        computeDynamicJamoBounds = function(img, ci, count, R, info, vType, hasJong) {
            const b = origBounds(img, ci, count, R, info, vType, hasJong);
            if (vType === 'C') {
                const isU = (info.jung === 'ㅝ' || info.jung === 'ㅞ' || info.jung === 'ㅟ');
                if (isU && b.yBarC) {
                    const W = R * count;
                    const yStart = Math.min(b.maxY - 4, b.yBarC + 4);
                    const yEnd = hasJong ? Math.min(b.maxY, b.jongY1 || b.maxY) : b.maxY;
                    const xRightLimit = Math.max(b.minX + 8, b.splitX - 2);
                    let stemX_U = Math.round(b.minX + (xRightLimit - b.minX) * 0.5), maxStemRun = -1;
                    let stemBot = yStart;
                    for (let x = b.minX + 2; x <= xRightLimit; x++) {
                        let run = 0, lastY = yStart;
                        for (let y = yStart; y <= yEnd; y++) {
                            if (img[(y * W + ci * R + x) * 4 + 3] > 50) { run++; lastY = y; }
                        }
                        if (run > maxStemRun) { maxStemRun = run; stemX_U = x; stemBot = lastY; }
                    }
                    if (maxStemRun >= 4) {
                        b.stemX_U = stemX_U;
                        b.stemBotY_U = stemBot;
                    }
                }
            }
            return b;
        };

        // Also test fitEntriesToGlyph adjustment for isU in C
        const origFit = Engine.fitEntriesToGlyph.bind(Engine);
        Engine.fitEntriesToGlyph = function() {
            origFit();
            const s = 1.5;
            this.jamoEntries.forEach(e => {
                if (e.vType === 'C' && e.subPart === 'jung_h') {
                    const jb = computeDynamicJamoBounds(this.glyphImg || new Uint8ClampedArray(150*150*4), 0, 1, 150, this.charsInfo[0], 'C', false);
                    const isU = ['ㅝ', 'ㅞ', 'ㅟ'].some(v => (e.whId || e.char || '').includes(v));
                    if (isU && jb && jb.splitX) {
                        e.fbox[2] = Math.max(18, (jb.splitX / s) + 1.0 - e.fbox[0]);
                        if (jb.stemBotY_U) {
                            e.fbox[3] = Math.max(14, (jb.stemBotY_U / s) + 1.0 - e.fbox[1]);
                        }
                    }
                }
            });
        };

        Engine.loadText('웨');
        return {
            badges: Engine.strokes.map((s, idx) => ({
                idx: idx + 1,
                start: [Math.round(s[0][0]*10)/10, Math.round(s[0][1]*10)/10],
                end: [Math.round(s[s.length-1][0]*10)/10, Math.round(s[s.length-1][1]*10)/10]
            }))
        };
    })()`);
    console.log(JSON.stringify(res, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
}
run();
