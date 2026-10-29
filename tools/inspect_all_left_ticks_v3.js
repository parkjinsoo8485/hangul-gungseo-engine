const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9985;
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
            const targetJungs = ['ㅓ','ㅔ','ㅕ','ㅖ','ㅏ','ㅑ','ㅐ','ㅒ'];

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

                        // 1. Find stemX_V (rightmost vertical stem) and stem1X (first vertical stem for double-stem vowels ㅐ,ㅒ,ㅔ,ㅖ)
                        const isDoubleV = (j === 'ㅐ' || j === 'ㅒ' || j === 'ㅔ' || j === 'ㅖ');
                        // Wait: for ㅏ, ㅑ, jb.stemX_V in computeDynamicJamoBounds picked a single column x with maxStemCol, not the center of the peak!
                        // Let's compute exact peak center for stemX_V!
                        let maxS2 = -1;
                        const s2Cols = [];
                        for (let x = jb.splitX + 2; x <= jb.maxX; x++) {
                            let sum = 0;
                            for (let y = jb.minY; y <= yUpperEnd; y++) if (img[(y * R + x) * 4 + 3] > 50) sum++;
                            s2Cols.push({ x, sum });
                            if (sum > maxS2) maxS2 = sum;
                        }
                        const p2 = s2Cols.filter(cs => cs.sum >= maxS2 * 0.85);
                        const exactStem2X = p2.length ? Math.round((p2[0].x + p2[p2.length - 1].x) * 0.5) : jb.stemX_V;

                        let stem1X = exactStem2X;
                        if (isDoubleV) {
                            let maxS1 = -1;
                            const scanS = Math.round(jb.minX + (jb.maxX - jb.minX) * 0.50);
                            const scanE = exactStem2X - Math.round(R * 0.08);
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

                        // Find left and right edges of stem1X (at 65th/35th percentile of rows in [0.22..0.78])
                        const s1Lefts = [], s1Rights = [];
                        for (let y = Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.22); y <= Math.round(jb.minY + (yUpperEnd - jb.minY) * 0.78); y += 2) {
                            if (img[(y * R + stem1X) * 4 + 3] < 80) continue;
                            let le = stem1X, re = stem1X;
                            while (le > stem1X - 18 && img[(y * R + le) * 4 + 3] > 80) le--;
                            while (re < stem1X + 18 && img[(y * R + re) * 4 + 3] > 80) re++;
                            s1Lefts.push(le + 1);
                            s1Rights.push(re - 1);
                        }
                        s1Lefts.sort((a, b) => a - b);
                        s1Rights.sort((a, b) => a - b);
                        const stem1Left = s1Lefts[Math.floor(s1Lefts.length * 0.65)] || (stem1X - 9);
                        const stem1Right = s1Rights[Math.floor(s1Rights.length * 0.35)] || (stem1X + 9);

                        // Find topY of stem1X
                        let stem1TopY = jb.minY;
                        while (stem1TopY < yUpperEnd && img[(stem1TopY * R + stem1X) * 4 + 3] < 80) stem1TopY++;
                        // Top serif ends around stem1TopY + 32px (about 0.095 * R)
                        const yS = Math.round(stem1TopY + R * (jongIdx ? 0.095 : 0.11));
                        const yE = Math.round(stem1TopY + (yUpperEnd - stem1TopY) * 0.85);

                        let ticks = [];
                        if (j === 'ㅓ' || j === 'ㅔ' || j === 'ㅕ' || j === 'ㅖ') {
                            const xProbeR = stem1Left - 3;
                            const xProbeL = Math.max(jb.minX, stem1Left - 20);
                            const getRuns = () => {
                                const arr = [];
                                for (let y = yS; y <= yE; y++) {
                                    let run = 0;
                                    for (let x = xProbeR; x >= xProbeL; x--) {
                                        if (img[(y * R + x) * 4 + 3] > 80) run++; else break;
                                    }
                                    arr.push({ y, run });
                                }
                                return arr;
                            };
                            const runs = getRuns();
                            if (j === 'ㅓ' || j === 'ㅔ') {
                                let maxR = -1, bestY = Math.round((yS + yE) * 0.5);
                                runs.forEach(r => { if (r.run > maxR) { maxR = r.run; bestY = r.y; } });
                                const pks = runs.filter(r => r.run >= maxR * 0.85);
                                if (pks.length) bestY = Math.round((pks[0].y + pks[pks.length - 1].y) * 0.5);
                                ticks.push({ y: bestY, yp: Number((bestY * 100 / R).toFixed(1)), maxRun: maxR });
                            } else {
                                // Find contiguous bands where run >= 4!
                                const bands = [];
                                let inB = false, b0 = 0, maxR = 0;
                                for (const r of runs) {
                                    if (r.run >= 4 && !inB) { inB = true; b0 = r.y; maxR = r.run; }
                                    else if (r.run >= 4 && inB) { if (r.run > maxR) maxR = r.run; }
                                    else if (r.run < 4 && inB) { inB = false; bands.push({ y0: b0, y1: r.y - 1, ym: Math.round((b0 + r.y - 1) * 0.5), len: r.y - b0, maxR }); }
                                }
                                if (inB) bands.push({ y0: b0, y1: yE, ym: Math.round((b0 + yE) * 0.5), len: yE - b0 + 1, maxR });
                                // Pick top 2 bands by length * maxR (or if >=2 bands, the two main bands)
                                const validBands = bands.filter(b => b.len >= 3);
                                if (validBands.length >= 2) {
                                    // If 3 bands (e.g. top serif tail), the two lower ones or two strongest ones?
                                    // Wait: ticks of ㅕ/ㅖ are at least 8% (28px) below stem1TopY!
                                    validBands.sort((a, b) => (b.len * b.maxR) - (a.len * a.maxR));
                                    const top2 = validBands.slice(0, 2).sort((a, b) => a.ym - b.ym);
                                    ticks.push({ y: top2[0].ym, yp: Number((top2[0].ym * 100 / R).toFixed(1)) });
                                    ticks.push({ y: top2[1].ym, yp: Number((top2[1].ym * 100 / R).toFixed(1)) });
                                } else {
                                    ticks.push({ y: yS, yp: Number((yS * 100 / R).toFixed(1)) }, { y: yE, yp: Number((yE * 100 / R).toFixed(1)) });
                                }
                            }
                        } else {
                            // ㅏ, ㅑ, ㅐ, ㅒ: ticks protrude to the RIGHT of stem1Right!
                            const xProbeL = stem1Right + 3;
                            const xProbeR = Math.min(jb.maxX, stem1Right + 22);
                            const runs = [];
                            for (let y = yS; y <= yE; y++) {
                                let run = 0;
                                for (let x = xProbeL; x <= xProbeR; x++) {
                                    if (img[(y * R + x) * 4 + 3] > 80) run++; else break;
                                }
                                runs.push({ y, run });
                            }
                            if (j === 'ㅏ' || j === 'ㅐ') {
                                let maxR = -1, bestY = Math.round((yS + yE) * 0.5);
                                runs.forEach(r => { if (r.run > maxR) { maxR = r.run; bestY = r.y; } });
                                const pks = runs.filter(r => r.run >= maxR * 0.85);
                                if (pks.length) bestY = Math.round((pks[0].y + pks[pks.length - 1].y) * 0.5);
                                ticks.push({ y: bestY, yp: Number((bestY * 100 / R).toFixed(1)), maxRun: maxR });
                            } else {
                                const bands = [];
                                let inB = false, b0 = 0, maxR = 0;
                                for (const r of runs) {
                                    if (r.run >= 3 && !inB) { inB = true; b0 = r.y; maxR = r.run; }
                                    else if (r.run >= 3 && inB) { if (r.run > maxR) maxR = r.run; }
                                    else if (r.run < 3 && inB) { inB = false; bands.push({ y0: b0, y1: r.y - 1, ym: Math.round((b0 + r.y - 1) * 0.5), len: r.y - b0, maxR }); }
                                }
                                if (inB) bands.push({ y0: b0, y1: yE, ym: Math.round((b0 + yE) * 0.5), len: yE - b0 + 1, maxR });
                                const validBands = bands.filter(b => b.len >= 3);
                                if (validBands.length >= 2) {
                                    validBands.sort((a, b) => (b.len * b.maxR) - (a.len * a.maxR));
                                    const top2 = validBands.slice(0, 2).sort((a, b) => a.ym - b.ym);
                                    ticks.push({ y: top2[0].ym, yp: Number((top2[0].ym * 100 / R).toFixed(1)) });
                                    ticks.push({ y: top2[1].ym, yp: Number((top2[1].ym * 100 / R).toFixed(1)) });
                                } else {
                                    ticks.push({ y: yS, yp: Number((yS * 100 / R).toFixed(1)) }, { y: yE, yp: Number((yE * 100 / R).toFixed(1)) });
                                }
                            }
                        }
                        out[j].push({ ch, c, hasJong: !!jongIdx, s1: Number((stem1X*100/R).toFixed(1)), ticks });
                    }
                }
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    for (const j of ['ㅔ', 'ㅖ', 'ㅓ', 'ㅕ', 'ㅐ', 'ㅒ', 'ㅏ', 'ㅑ']) {
        console.log(`=== ${j} (no jong) ===`);
        console.log(data[j].filter(x => !x.hasJong).map(d => `${d.ch}:${d.ticks.map(t => t.yp).join(',')}`).join(' | '));
        console.log(`=== ${j} (with jong) ===`);
        console.log(data[j].filter(x => x.hasJong).map(d => `${d.ch}:${d.ticks.map(t => t.yp).join(',')}`).join(' | '));
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
