const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9990;
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
            const targetJungs = ['ㅓ','ㅔ','ㅕ','ㅖ','ㅐ','ㅒ'];

            const out = {};
            for (const j of targetJungs) {
                out[j] = [];
                for (const c of chos) {
                    for (const jongIdx of [0, 1]) {
                        const code = 0xAC00 + (chos.indexOf(c) * 21 + jungs.indexOf(j)) * 28 + jongIdx;
                        const ch = String.fromCharCode(code);
                        ctx.clearRect(0, 0, R, R);
                        ctx.fillText(ch, R / 2, R / 2);
                        const img = ctx.getImageData(0, 0, R, R).data;
                        const jb = computeDynamicJamoBounds(img, 0, 1, R, { cho: c, jung: j, jong: jongIdx ? 'ㄱ' : '' }, 'V', !!jongIdx);
                        const yUpperEnd = jongIdx ? jb.choY2 : jb.maxY;

                        // Find stems in x > splitX - 8
                        // Wait: for ㅐ, ㅒ, ㅔ, ㅖ, there are TWO vertical stems!
                        // Let's find the two vertical stem peaks in [minX + 0.42*W, maxX]!
                        const colSums = [];
                        for (let x = Math.round(jb.minX + (jb.maxX - jb.minX) * 0.42); x <= jb.maxX; x++) {
                            let sum = 0;
                            for (let y = jb.minY; y <= yUpperEnd; y++) {
                                if (img[(y * R + x) * 4 + 3] > 50) sum++;
                            }
                            colSums.push({ x, xp: Number((x * 100 / R).toFixed(1)), sum });
                        }
                        // Rightmost stem is stemX_V (already in jb.stemX_V)
                        // For ㅐ, ㅒ, ㅔ, ㅖ, what is the first stem (stem1X)?
                        // It is the local maximum of colSum in [minX + 0.42*W, jb.stemX_V - 20]!
                        let stem1X = jb.stemX_V;
                        if (['ㅐ','ㅒ','ㅔ','ㅖ'].includes(j)) {
                            let maxS1 = -1;
                            for (const cs of colSums) {
                                if (cs.x <= jb.stemX_V - Math.round(R * 0.08)) {
                                    if (cs.sum > maxS1) { maxS1 = cs.sum; stem1X = cs.x; }
                                }
                            }
                            // refine center of peak
                            const p1 = colSums.filter(cs => cs.x <= jb.stemX_V - Math.round(R * 0.08) && cs.sum >= maxS1 * 0.85);
                            if (p1.length) stem1X = Math.round((p1[0].x + p1[p1.length - 1].x) * 0.5);
                        }

                        // Now where is the horizontal tick(s) to the LEFT of stem1X (for ㅓ, ㅔ, ㅕ, ㅖ)?
                        // Let's scan y in [minY + 0.15*H, yUpperEnd - 0.10*H], and count horizontal run to the left of stem1X - 4!
                        const rowRuns = [];
                        const scanLeftEnd = stem1X - 4;
                        const scanLeftStart = Math.max(jb.minX, stem1X - Math.round(R * 0.18));
                        for (let y = Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.15); y <= Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.88); y++) {
                            let run = 0, leftEdge = scanLeftEnd;
                            for (let x = scanLeftEnd; x >= scanLeftStart; x--) {
                                if (img[(y * R + x) * 4 + 3] > 80) { run++; leftEdge = x; }
                                else break;
                            }
                            rowRuns.push({ y, yp: Number((y * 100 / R).toFixed(1)), run, leftEdgeXp: Number((leftEdge * 100 / R).toFixed(1)) });
                        }
                        out[j].push({
                            ch, c, hasJong: !!jongIdx,
                            splitX: Number((jb.splitX * 100 / R).toFixed(1)),
                            stem1X: Number((stem1X * 100 / R).toFixed(1)),
                            stem2X: Number((jb.stemX_V * 100 / R).toFixed(1))
                        });
                    }
                }
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    for (const j of ['ㅔ', 'ㅖ', 'ㅐ', 'ㅒ']) {
        console.log(`=== ${j} (no jong) ===`);
        console.log(data[j].filter(d => !d.hasJong).map(d => `${d.ch}:split=${d.splitX},s1=${d.stem1X},s2=${d.stem2X}`).join(' | '));
        console.log(`=== ${j} (with jong) ===`);
        console.log(data[j].filter(d => d.hasJong).map(d => `${d.ch}:split=${d.splitX},s1=${d.stem1X},s2=${d.stem2X}`).join(' | '));
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
