const http = require('http');
const PORT = 9995;
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_harness_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 36 representative syllables covering all 11 double vowels (T1 & T2)
const TEST_CHARACTERS = [
    // T1 (No batchim)
    '애', '얘', '에', '예', '와', '왜', '외', '워', '웨', '위', '의',
    '개', '걔', '게', '계', '과', '괘', '괴', '궈', '궤', '귀',
    '배', '뱨', '베', '볘', '봐', '봬', '뵈', '붜', '붸', '뷔',
    // T2 (With batchim)
    '액', '얙', '엑', '옉', '왁', '왝', '획', '웍', '웩', '윅', '읙',
    '객', '걕', '겍', '곅', '곽', '괙', '괵', '궉', '궥', '귁',
    '백', '뱩', '벡', '볙', '광', '뵘', '권', '웹', '쉼', '흰'
];

async function run() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { }
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 30; i++) {
        const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
        if (chk.result && chk.result.value) break;
        await sleep(300);
    }

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    console.log(`Starting Video Frame Precision Harness for ${TEST_CHARACTERS.length} double vowel characters...`);

    const results = await evalJs(`(() => {
        const chars = ${JSON.stringify(TEST_CHARACTERS)};
        const out = [];

        chars.forEach(ch => {
            Engine.loadText(ch);
            const strokes = Engine.strokes;
            const g = Engine.glyphData;
            const R = g.R, W = g.W;
            const K = strokes.length;

            // 1. Cutoff Check
            const strokeStats = strokes.map((pts, sIdx) => {
                let count = 0;
                let minY = 1e9, maxY = -1e9;
                for (let i = 0; i < g.key.length; i++) {
                    const s = Math.floor(g.key[i] / 4096);
                    if (s === sIdx) {
                        count++;
                        const y = Math.floor(g.idx[i] / W);
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
                let ptsMinY = 1e9, ptsMaxY = -1e9;
                pts.forEach(p => {
                    const py = p[1] * R / 100;
                    if (py < ptsMinY) ptsMinY = py;
                    if (py > ptsMaxY) ptsMaxY = py;
                });
                return { sIdx, count, pixSpan: maxY - minY, ptsSpan: ptsMaxY - ptsMinY };
            });

            const cutoffs = strokeStats.filter(st => st.ptsSpan > 80 && st.pixSpan < st.ptsSpan * 0.70);

            // 2. Video Frame by Frame Bleeding Check
            // Map each stroke's core pixel set (excluding points within 5px of other strokes' centerlines)
            const strokeCorePixels = Array.from({ length: K }, () => []);
            for (let i = 0; i < g.key.length; i++) {
                const s = Math.floor(g.key[i] / 4096);
                const p = g.idx[i];
                const px = p % W, py = Math.floor(p / W);

                // Check distance to all OTHER strokes
                let minOtherDist = 1e9;
                for (let oS = 0; oS < K; oS++) {
                    if (oS === s) continue;
                    const oPts = strokes[oS];
                    const ci = Math.floor(oPts[Math.floor(oPts.length / 2)][0] / 100);
                    for (let pi = 0; pi < oPts.length; pi++) {
                        const qx = (oPts[pi][0] - ci * 100) * R / 100, qy = oPts[pi][1] * R / 100;
                        const d = Math.hypot(px - qx, py - qy);
                        if (d < minOtherDist) minOtherDist = d;
                    }
                }
                // Only consider core pixels (> 6px away from other strokes) to test pure body bleeding
                if (minOtherDist >= 6.0) {
                    strokeCorePixels[s].push(p);
                }
            }

            // Step-by-step animation simulation
            let totalBleedEvents = 0;
            const bleedDetails = [];

            for (let currS = 0; currS < K - 1; currS++) {
                Engine.resetPractice();
                Engine.currentStroke = currS;
                const pts = strokes[currS];

                // Gather core pixels of FUTURE strokes
                const futurePixels = [];
                for (let futS = currS + 1; futS < K; futS++) {
                    futurePixels.push(...strokeCorePixels[futS]);
                }

                for (let step = 0; step <= pts.length; step++) {
                    Engine.currentStep = step;
                    Engine.renderGlyphInk();

                    const cv = document.getElementById('glyph-canvas');
                    const ctx = cv.getContext('2d');
                    const img = ctx.getImageData(0, 0, W, R).data;

                    let bledPixelsThisStep = 0;
                    for (let fIdx = 0; fIdx < futurePixels.length; fIdx++) {
                        const p = futurePixels[fIdx];
                        const o = p * 4;
                        if (img[o + 3] > 100 && img[o] < 50) {
                            bledPixelsThisStep++;
                        }
                    }

                    if (bledPixelsThisStep > 0) {
                        totalBleedEvents++;
                        bleedDetails.push({
                            currStroke: currS,
                            step,
                            totalSteps: pts.length,
                            bledPixels: bledPixelsThisStep
                        });
                    }
                }
            }

            out.push({
                ch,
                strokesCount: K,
                cutoffsCount: cutoffs.length,
                cutoffs,
                bleedEventsCount: totalBleedEvents,
                bleedDetails
            });
        });

        return out;
    })()`);

    console.log(`\n=================== HARNESS VERIFICATION REPORT ===================`);
    let failedCutoffs = 0;
    let failedBleed = 0;

    results.forEach(r => {
        const okCutoff = r.cutoffsCount === 0;
        const okBleed = r.bleedEventsCount === 0;
        if (!okCutoff) failedCutoffs++;
        if (!okBleed) failedBleed++;

        const status = (okCutoff && okBleed) ? 'PASS [100% CLEAN]' : 'FAIL';
        console.log(`${r.ch.padEnd(3)} | Strokes: ${r.strokesCount} | Cutoffs: ${r.cutoffsCount} | Bleed Events: ${r.bleedEventsCount} -> ${status}`);
        if (!okCutoff) console.log(`   Cutoff anomalies:`, r.cutoffs);
        if (!okBleed) console.log(`   Bleed details:`, r.bleedDetails);
    });

    console.log(`\nSummary:`);
    console.log(`Total Tested Characters: ${results.length}`);
    console.log(`Total Cutoff Failures: ${failedCutoffs}`);
    console.log(`Total Video Frame Bleed Failures: ${failedBleed}`);
    console.log(`===================================================================\n`);

    ws.close();
    chrome.kill();

    if (failedCutoffs === 0 && failedBleed === 0) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

run().catch(e => { console.error(e); process.exit(1); });
