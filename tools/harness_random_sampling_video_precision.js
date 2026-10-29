const http = require('http');
const PORT = 9996;
const fs = require('fs');
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rnd_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Deterministic Pseudo-Random Generator (LCG) with seed for reproducible randomized sampling
function generateRandomHangul(count, seed = 20261029) {
    let s = seed;
    const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    const set = new Set();

    // 1. Mandatory complex archetype clusters (complex vowels + double batchims)
    const criticalArchetypes = [
        '웨', '에', '예', '왜', '애', '얘', '워', '외', '위', '의', '와',
        '값', '닭', '흙', '밝', '맑', '앉', '얹', '넓', '얇', '끊', '닳', '잃', '읊', '훑', '싫',
        '깎', '꺾', '낚', '섞', '묶', '볶', '있', '없', '었', '됐', '봤',
        '걻', '겳', '긻', '붸', '봬', '뵘', '늭', '읙', '홰', '횃', '횡', '뮨', '팧'
    ];
    criticalArchetypes.forEach(ch => set.add(ch));

    // 2. Uniformly distribute random picks across AC00..D7A3
    while (set.size < count) {
        const code = 0xAC00 + Math.floor(rnd() * 11172);
        set.add(String.fromCharCode(code));
    }

    return Array.from(set);
}

const SAMPLE_SIZE = 100;
const TEST_WORDS = generateRandomHangul(SAMPLE_SIZE);

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

    console.log(`===================================================================`);
    console.log(`  RANDOM SAMPLING VIDEO FRAME PRECISION HARNESS (${SAMPLE_SIZE} SYLLABLES)`);
    console.log(`===================================================================`);

    const BATCH = 20;
    const allReports = [];
    const t0 = Date.now();

    for (let i = 0; i < TEST_WORDS.length; i += BATCH) {
        const batchChars = TEST_WORDS.slice(i, i + BATCH);
        const batchResults = await evalJs(`(() => {
            const chars = ${JSON.stringify(batchChars)};
            const out = [];

            chars.forEach(ch => {
                Engine.loadText(ch);
                const strokes = Engine.strokes;
                const g = Engine.glyphData;
                if (!g) return;
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

                const cutoffs = strokeStats.filter(st => {
                    const meta = Engine.strokeMeta && Engine.strokeMeta[st.sIdx];
                    if (meta && meta.part === 'jong') {
                        const jb = (Engine.jamoBoxes && Engine.jamoBoxes[0]) || {};
                        const maxJongH = (jb.jongY2 && jb.jongY1) ? (jb.jongY2 - jb.jongY1) : 65;
                        const effPtsSpan = Math.min(st.ptsSpan, maxJongH * 0.95);
                        return effPtsSpan > 45 && st.pixSpan < effPtsSpan * 0.55;
                    }
                    return st.ptsSpan > 80 && st.pixSpan < st.ptsSpan * 0.70;
                });

                // 2. Video Frame by Frame Bleeding Check
                // Collect core pixels (> 6.0px away from all other strokes) for every stroke
                const strokeCorePixels = Array.from({ length: K }, () => []);
                for (let i = 0; i < g.key.length; i++) {
                    const s = Math.floor(g.key[i] / 4096);
                    const p = g.idx[i];
                    const px = p % W, py = Math.floor(p / W);

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
                    if (minOtherDist >= 6.0) {
                        strokeCorePixels[s].push(p);
                    }
                }

                // Step-by-step animation simulation
                let totalBleedEvents = 0;
                let maxBledPixelsInAnyStep = 0;
                let totalFramesInspected = 0;

                for (let currS = 0; currS < K - 1; currS++) {
                    Engine.resetPractice();
                    Engine.currentStroke = currS;
                    const pts = strokes[currS];

                    // Core pixels of all subsequent future strokes
                    const futurePixels = [];
                    for (let futS = currS + 1; futS < K; futS++) {
                        futurePixels.push(...strokeCorePixels[futS]);
                    }
                    if (futurePixels.length === 0) continue;

                    // Inspect across animation steps
                    const stepInc = Math.max(1, Math.floor(pts.length / 8));
                    for (let step = 0; step <= pts.length; step += stepInc) {
                        totalFramesInspected++;
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
                            if (bledPixelsThisStep > maxBledPixelsInAnyStep) {
                                maxBledPixelsInAnyStep = bledPixelsThisStep;
                            }
                        }
                    }
                }

                out.push({
                    ch,
                    strokesCount: K,
                    totalFramesInspected,
                    cutoffsCount: cutoffs.length,
                    bleedEventsCount: totalBleedEvents,
                    maxBledPixelsInAnyStep
                });
            });

            return out;
        })()`);

        allReports.push(...batchResults);
        const progress = Math.min(TEST_WORDS.length, i + BATCH);
        console.log(`Progress: ${progress} / ${TEST_WORDS.length} syllables tested...`);
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    // Summary calculation
    const totalCutoffs = allReports.reduce((acc, r) => acc + r.cutoffsCount, 0);
    const totalBleedEvents = allReports.reduce((acc, r) => acc + r.bleedEventsCount, 0);
    const totalFrames = allReports.reduce((acc, r) => acc + r.totalFramesInspected, 0);
    const passedChars = allReports.filter(r => r.cutoffsCount === 0 && r.bleedEventsCount === 0);

    console.log(`\n=================== HARNESS VERIFICATION SUMMARY ===================`);
    console.log(`Total Random Syllables Tested:     ${allReports.length}`);
    console.log(`Total Video Frames Inspected:      ${totalFrames} frames`);
    console.log(`Execution Time:                    ${elapsed}s`);
    console.log(`Total Vertical Cutoff Anomalies:   ${totalCutoffs}`);
    console.log(`Total Inter-Stroke Bleed Events:   ${totalBleedEvents}`);
    console.log(`Overall Pass Rate:                 ${((passedChars.length / allReports.length) * 100).toFixed(2)}% (${passedChars.length} / ${allReports.length})`);
    console.log(`===================================================================`);

    // Save report to JSON
    const reportData = {
        summary: {
            sampleSize: allReports.length,
            totalFrames,
            totalCutoffs,
            totalBleedEvents,
            passRate: `${((passedChars.length / allReports.length) * 100).toFixed(2)}%`,
            elapsedSeconds: elapsed
        },
        samples: allReports
    };
    fs.writeFileSync('tools/random_sampling_precision_report.json', JSON.stringify(reportData, null, 2), 'utf8');

    ws.close();
    chrome.kill();
    process.exit(totalBleedEvents === 0 && totalCutoffs === 0 ? 0 : 1);
}

run().catch(e => { console.error(e); process.exit(1); });
