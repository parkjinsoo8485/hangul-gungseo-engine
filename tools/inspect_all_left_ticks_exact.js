const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9987;
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
            const targetJungs = ['ㅓ','ㅔ','ㅕ','ㅖ'];

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

                        // Find stem1X
                        let stem1X = jb.stemX_V;
                        if (j === 'ㅔ' || j === 'ㅖ') {
                            let maxS1 = -1;
                            const scanS = Math.round(jb.minX + (jb.maxX - jb.minX) * 0.50);
                            const scanE = jb.stemX_V - Math.round(R * 0.08);
                            const cols = [];
                            for (let x = scanS; x <= scanE; x++) {
                                let sum = 0;
                                for (let y = jb.minY; y <= yUpperEnd; y++) if (img[(y * R + x) * 4 + 3] > 50) sum++;
                                cols.push({ x, sum });
                                if (sum > maxS1) maxS1 = sum;
                            }
                            const p1 = cols.filter(cs => cs.sum >= maxS1 * 0.85);
                            if (p1.length) stem1X = Math.round((p1[0].x + p1[p1.length - 1].x) * 0.5);
                        }

                        // Find left edge of stem1X in rows where there is no tick (e.g., near top of stem1X, y in [minY + 0.15*H, minY + 0.25*H])
                        let stem1Left = stem1X - 4;
                        const yStemCheck = Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.22);
                        while (stem1Left > jb.minX && img[(yStemCheck * R + stem1Left) * 4 + 3] > 80) stem1Left--;

                        // Now scan y in [minY + 0.18*H, minY + 0.85*H] to find the tick Y centers!
                        // At x = stem1Left - 3 (just to the left of the vertical stem), any ink is a horizontal tick!
                        const xTickProbe = stem1Left - 3;
                        const tickRows = [];
                        const yS = Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.16);
                        const yE = Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.88);
                        let inBand = false, bandStart = 0;
                        const bands = [];
                        for (let y = yS; y <= yE; y++) {
                            const hasInk = img[(y * R + xTickProbe) * 4 + 3] > 80 && img[(y * R + xTickProbe - 2) * 4 + 3] > 80;
                            if (hasInk && !inBand) { inBand = true; bandStart = y; }
                            else if (!hasInk && inBand) { inBand = false; bands.push([bandStart, y - 1]); }
                        }
                        if (inBand) bands.push([bandStart, yE]);

                        const ticks = bands.map(([b0, b1]) => {
                            const ym = Math.round((b0 + b1) * 0.5);
                            // Trace left from xTickProbe at ym, or find the neck (minimum vertical thickness) between xTickProbe and cho!
                            let lx = xTickProbe;
                            let minThick = 999, neckX = lx;
                            for (let x = xTickProbe; x >= jb.minX + 10; x--) {
                                if (img[(ym * R + x) * 4 + 3] < 50) { lx = x + 1; break; }
                                // Measure vertical thickness of ink at (x, ym)
                                let up = 0, dn = 0;
                                while (up < 30 && img[((ym - up) * R + x) * 4 + 3] > 80) up++;
                                while (dn < 30 && img[((ym + dn) * R + x) * 4 + 3] > 80) dn++;
                                const thick = up + dn - 1;
                                if (thick <= minThick) { minThick = thick; neckX = x; }
                                // If thickness suddenly flares up (> minThick + 6), we hit the Cho consonant!
                                if (thick > minThick + 6 && x < xTickProbe - 4) {
                                    lx = neckX;
                                    break;
                                }
                                lx = x;
                            }
                            return {
                                yMidPct: Number((ym * 100 / R).toFixed(1)),
                                leftXPct: Number((lx * 100 / R).toFixed(1)),
                                rightXPct: Number((stem1X * 100 / R).toFixed(1))
                            };
                        });

                        out[j].push({
                            ch, c, hasJong: !!jongIdx,
                            stem1Xp: Number((stem1X * 100 / R).toFixed(1)),
                            stem1LeftXp: Number((stem1Left * 100 / R).toFixed(1)),
                            ticks
                        });
                    }
                }
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    for (const j of ['ㅔ', 'ㅖ', 'ㅓ', 'ㅕ']) {
        console.log(`=== ${j} (no jong) ===`);
        console.log(data[j].filter(x => !x.hasJong).map(d => `${d.ch}(s1=${d.stem1Xp}):` + d.ticks.map(t => `[Y=${t.yMidPct},X=${t.leftXPct}..${t.rightXPct}]`).join(',')).join(' | '));
        console.log(`=== ${j} (with jong) ===`);
        console.log(data[j].filter(x => x.hasJong).map(d => `${d.ch}(s1=${d.stem1Xp}):` + d.ticks.map(t => `[Y=${t.yMidPct},X=${t.leftXPct}..${t.rightXPct}]`).join(',')).join(' | '));
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
