const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9986;
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

                        // 1. Find stem1X (first vertical stem of vowel)
                        let stem1X = jb.stemX_V;
                        if (j === 'ㅔ' || j === 'ㅖ') {
                            let maxS1 = -1;
                            const scanS = Math.round(jb.minX + (jb.maxX - jb.minX) * 0.46);
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

                        // 2. Find left edge of stem1X in the lower-middle part of the stem (or median left edge across y)
                        const leftEdges = [];
                        for (let y = Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.25); y <= Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.75); y += 2) {
                            let le = stem1X;
                            while (le > stem1X - 18 && img[(y * R + le) * 4 + 3] > 80) le--;
                            leftEdges.push(le + 1);
                        }
                        leftEdges.sort((a, b) => a - b);
                        // The 75th percentile (largest x) is the pure stem left edge (where ticks don't protrude)
                        const stem1Left = leftEdges[Math.floor(leftEdges.length * 0.75)] || (stem1X - 9);

                        // 3. Scan y in [minY + 0.24*(yUpperEnd-minY), minY + 0.82*(yUpperEnd-minY)] (below top serif!)
                        // Measure horizontal ink run in [stem1Left - 18, stem1Left - 2]
                        const yS = Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.24);
                        const yE = Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.82);
                        const xProbeR = stem1Left - 2;
                        const xProbeL = Math.max(jb.minX, stem1Left - 18);

                        // For ㅓ/ㅔ: find 1 peak band. For ㅕ/ㅖ: find 2 peak bands (upper half vs lower half of [yS, yE])
                        const findTickInRange = (yr0, yr1) => {
                            let bestY = Math.round((yr0 + yr1) * 0.5), maxRun = -1;
                            const rows = [];
                            for (let y = yr0; y <= yr1; y++) {
                                let run = 0;
                                for (let x = xProbeR; x >= xProbeL; x--) {
                                    if (img[(y * R + x) * 4 + 3] > 80) run++;
                                    else break;
                                }
                                rows.push({ y, run });
                                if (run > maxRun) { maxRun = run; bestY = y; }
                            }
                            if (maxRun >= 3) {
                                const peakRows = rows.filter(r => r.run >= maxRun * 0.85);
                                if (peakRows.length) bestY = Math.round((peakRows[0].y + peakRows[peakRows.length - 1].y) * 0.5);
                            }
                            // Now find the left start X of this tick at bestY!
                            let lx = xProbeR, minThick = 999, neckX = xProbeR;
                            for (let x = xProbeR; x >= Math.max(jb.minX + 10, stem1Left - 38); x--) {
                                if (img[(bestY * R + x) * 4 + 3] < 60) { lx = x + 1; break; }
                                let up = 0, dn = 0;
                                while (up < 28 && img[((bestY - up) * R + x) * 4 + 3] > 80) up++;
                                while (dn < 28 && img[((bestY + dn) * R + x) * 4 + 3] > 80) dn++;
                                const thick = up + dn - 1;
                                if (thick <= minThick) { minThick = thick; neckX = x; }
                                if (thick > minThick + 5 && x < xProbeR - 4) {
                                    lx = neckX;
                                    break;
                                }
                                lx = x;
                            }
                            return { y: bestY, yp: Number((bestY * 100 / R).toFixed(1)), lxp: Number((lx * 100 / R).toFixed(1)), rxp: Number((stem1X * 100 / R).toFixed(1)) };
                        };

                        let ticks = [];
                        if (j === 'ㅓ' || j === 'ㅔ') {
                            ticks.push(findTickInRange(yS, yE));
                        } else {
                            // ㅕ, ㅖ: split [yS, yE] at valley near middle!
                            const yMid0 = Math.round(yS + (yE - yS) * 0.35);
                            const yMid1 = Math.round(yS + (yE - yS) * 0.65);
                            let ySplitTick = Math.round((yS + yE) * 0.5), minMidRun = 999;
                            for (let y = yMid0; y <= yMid1; y++) {
                                let run = 0;
                                for (let x = xProbeR; x >= xProbeL; x--) {
                                    if (img[(y * R + x) * 4 + 3] > 80) run++; else break;
                                }
                                if (run < minMidRun) { minMidRun = run; ySplitTick = y; }
                            }
                            ticks.push(findTickInRange(yS, ySplitTick));
                            ticks.push(findTickInRange(ySplitTick, yE));
                        }

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
        console.log(data[j].filter(x => !x.hasJong).map(d => `${d.ch}(s1=${d.stem1Xp}):` + d.ticks.map(t => `[Y=${t.yp},X=${t.lxp}..${t.rxp}]`).join(',')).join(' | '));
        console.log(`=== ${j} (with jong) ===`);
        console.log(data[j].filter(x => x.hasJong).map(d => `${d.ch}(s1=${d.stem1Xp}):` + d.ticks.map(t => `[Y=${t.yp},X=${t.lxp}..${t.rxp}]`).join(',')).join(' | '));
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
