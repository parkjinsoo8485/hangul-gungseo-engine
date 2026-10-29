const { spawn } = require('child_process'), http = require('http');
const PORT = 9983;
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
            const jungs = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
            const chos = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅎ'];
            const out = {};
            const R = 360;
            const ff = Engine.styleParams.fontFamily;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;

            for (const j of jungs) {
                const jIdx = JUNG_LIST.indexOf(j);
                const samples = [];
                for (const c of ['ㅇ', 'ㄱ', 'ㄷ']) {
                    for (const jongIdx of [0, 1]) {
                        const cIdx = CHO_LIST.indexOf(c);
                        const ch = String.fromCharCode(0xAC00 + (cIdx * 21 + jIdx) * 28 + jongIdx);
                        Engine.loadText(ch);
                        ctx.clearRect(0, 0, R, R);
                        ctx.fillText(ch, R / 2, R / 2);
                        const img = ctx.getImageData(0, 0, R, R).data;

                        const strokes = Engine.strokes.map((pts, s) => {
                            let onInk = 0;
                            pts.forEach(p => {
                                const x = Math.round(p[0] * R / 100), y = Math.round(p[1] * R / 100);
                                if (x >= 0 && x < R && y >= 0 && y < R && img[(y * R + x) * 4 + 3] > 60) onInk++;
                            });
                            // Count pixels owned by stroke s in glyphData
                            let pxCount = 0;
                            if (Engine.glyphData) {
                                for (let i = 0; i < Engine.glyphData.sid.length; i++) {
                                    if (Engine.glyphData.sid[i] === s) pxCount++;
                                }
                            }
                            return {
                                s: s + 1,
                                part: Engine.strokeMeta[s].part,
                                sub: Engine.strokeMeta[s].subPart,
                                p0: [Number(pts[0][0].toFixed(1)), Number(pts[0][1].toFixed(1))],
                                p1: [Number(pts[pts.length - 1][0].toFixed(1)), Number(pts[pts.length - 1][1].toFixed(1))],
                                len: Number(Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]).toFixed(1)),
                                onInkRatio: Number((onInk / pts.length).toFixed(2)),
                                pxCount
                            };
                        });
                        samples.push({ ch, strokes });
                    }
                }
                out[j] = samples;
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    for (const [j, samples] of Object.entries(data)) {
        console.log(`\n=== VOWEL ${j} ===`);
        for (const smp of samples) {
            const stStr = smp.strokes.map(st => {
                const flag = (st.onInkRatio < 0.75 || st.pxCount < 60 || (st.len < 6 && st.s > 1)) ? '⚠️' : '';
                return `${flag}#${st.s}(${st.part}):[${st.p0}]->[${st.p1}](L:${st.len},ink:${st.onInkRatio},px:${st.pxCount})`;
            }).join(' | ');
            console.log(`  ${smp.ch}: ${stStr}`);
        }
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
