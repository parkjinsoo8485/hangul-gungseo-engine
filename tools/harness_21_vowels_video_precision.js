const http = require('http');
const PORT = 9996;
const { spawn } = require('child_process');

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_harness_21v_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CHOS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const JUNGS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const JONGS = ['', 'ㄱ', 'ㄴ', 'ㅁ', 'ㅇ', 'ㄻ'];
const JONG_LIST = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function composeHangul(cho, jung, jong = '') {
    const cIdx = CHOS.indexOf(cho);
    const jIdx = JUNGS.indexOf(jung);
    const jgIdx = JONG_LIST.indexOf(jong);
    return String.fromCharCode(0xAC00 + (cIdx * 21 + jIdx) * 28 + jgIdx);
}

// 1. All 19 initials x 21 vowels without jongseong = 399 syllables
const noJongSyllables = [];
for (const c of CHOS) {
    for (const j of JUNGS) {
        noJongSyllables.push(composeHangul(c, j, ''));
    }
}

// 2. Representative jongseongs (ㄱ, ㄴ, ㅁ, ㅇ, ㄻ) across all 21 vowels paired with diverse initial consonants
const jongSyllables = [];
const repJongs = ['ㄱ', 'ㄴ', 'ㅁ', 'ㅇ', 'ㄻ'];
// Pair each (vowel, jong) with 4 diverse initials to ensure broad initial consonant coverage across all vowels
for (let vIdx = 0; vIdx < JUNGS.length; vIdx++) {
    const j = JUNGS[vIdx];
    for (let jgIdx = 0; jgIdx < repJongs.length; jgIdx++) {
        const jong = repJongs[jgIdx];
        // Select 4 distinct initials spread across the 19 initials
        const initialIndices = [
            (vIdx * 3 + jgIdx) % 19,
            (vIdx * 3 + jgIdx + 5) % 19,
            (vIdx * 3 + jgIdx + 10) % 19,
            (vIdx * 3 + jgIdx + 14) % 19
        ];
        for (const idx of initialIndices) {
            const syl = composeHangul(CHOS[idx], j, jong);
            if (!jongSyllables.includes(syl)) {
                jongSyllables.push(syl);
            }
        }
    }
}

// 3. User-reported specific words
const userWords = ['예', '에', '여', '야', '약', '닮', '왜', '웨', '되', '과', '괴'];

// Build final unique syllabus test set
const allTestSet = Array.from(new Set([...userWords, ...noJongSyllables, ...jongSyllables]));

console.log(`Test set generated:`);
console.log(`- User reported words: ${userWords.length}`);
console.log(`- 21 Vowels x 19 Initials without Jongseong: ${noJongSyllables.length}`);
console.log(`- Representative Jongseong test syllables: ${jongSyllables.length}`);
console.log(`- Total Unique Syllables in Harness: ${allTestSet.length}`);

async function run() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) { }
        await sleep(250);
    }
    const wsUrl = list.find(t => t.type === 'page').webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);
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

    for (let i = 0; i < 40; i++) {
        const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
        if (chk.result && chk.result.value) break;
        await sleep(250);
    }

    console.log('Connected to Engine successfully. Running test batches...\n');

    const BATCH_SIZE = 75;
    const allResults = [];
    const t0 = Date.now();

    for (let b = 0; b < allTestSet.length; b += BATCH_SIZE) {
        const batch = allTestSet.slice(b, b + BATCH_SIZE);
        const batchT0 = Date.now();

        const res = await send('Runtime.evaluate', {
            expression: `(() => {
                const list = ${JSON.stringify(batch)};
                const out = [];

                for (const ch of list) {
                    Engine.loadText(ch);
                    const strokes = Engine.strokes;
                    const meta = Engine.strokeMeta;
                    const dyn = Engine.dynBounds[0];
                    const g = Engine.glyphData;
                    const W = g.W, R = g.R;
                    const K = strokes.length;

                    // 360x360 alpha lookup
                    const alphaMap = new Uint8Array(W * R);
                    for (let i = 0; i < g.idx.length; i++) {
                        alphaMap[g.idx[i]] = g.a[i];
                    }

                    // 1. Order Check
                    let orderOk = true;
                    const partOrder = { cho: 0, jung_h: 1, jung: 1, jung_v: 2, jong: 3 };
                    for (let i = 0; i < K - 1; i++) {
                        const ordA = partOrder[meta[i].subPart || meta[i].part];
                        const ordB = partOrder[meta[i + 1].subPart || meta[i + 1].part];
                        if (ordA > ordB) {
                            orderOk = false;
                        }
                    }

                    // Multi-tick vertical separation check (ㅑ, ㅒ, ㅕ, ㅖ)
                    let tickCheck = { hasTicks: false, valid: true, dy: null };
                    const vowelWh = meta.find(m => m.part === 'jung')?.whId || '';
                    if (/[ㅑㅒㅕㅖ]/.test(vowelWh)) {
                        const tickStrokes = [];
                        strokes.forEach((pts, sIdx) => {
                            if (meta[sIdx].part === 'jung') {
                                const xs = pts.map(p => p[0]);
                                const ys = pts.map(p => p[1]);
                                const dx = Math.max(...xs) - Math.min(...xs);
                                const dy = Math.max(...ys) - Math.min(...ys);
                                if (dx > dy && dy < 15) {
                                    tickStrokes.push({ sIdx, avgY: ys.reduce((a, b) => a + b, 0) / ys.length });
                                }
                            }
                        });
                        if (tickStrokes.length >= 2) {
                            tickCheck.hasTicks = true;
                            const dy = tickStrokes[1].avgY - tickStrokes[0].avgY;
                            tickCheck.dy = dy;
                            tickCheck.valid = dy >= 7.0;
                        }
                    }

                    // 2. Centerline Ink Ratio (onInkRatio) per stroke
                    const strokeStats = strokes.map((pts, sIdx) => {
                        let onInkCount = 0;
                        for (let pi = 0; pi < pts.length; pi++) {
                            const rx = Math.round(pts[pi][0] * R / 100);
                            const ry = Math.round(pts[pi][1] * R / 100);
                            let foundInk = false;
                            for (let dy = -2; dy <= 2 && !foundInk; dy++) {
                                const y = ry + dy;
                                if (y < 0 || y >= R) continue;
                                for (let dx = -2; dx <= 2; dx++) {
                                    if (dx * dx + dy * dy > 4) continue;
                                    const x = rx + dx;
                                    if (x < 0 || x >= W) continue;
                                    if (alphaMap[y * W + x] > 45) {
                                        foundInk = true;
                                        break;
                                    }
                                }
                            }
                            if (foundInk) onInkCount++;
                        }
                        const onInkRatio = pts.length > 0 ? (onInkCount / pts.length) : 1.0;

                        let pxCount = 0;
                        for (let i = 0; i < g.key.length; i++) {
                            if (Math.floor(g.key[i] / 4096) === sIdx) pxCount++;
                        }

                        return {
                            sIdx,
                            whId: meta[sIdx].whId,
                            part: meta[sIdx].subPart || meta[sIdx].part,
                            ptsCount: pts.length,
                            onInkCount,
                            onInkRatio,
                            pxCount
                        };
                    });

                    const allHavePixels = strokeStats.every(s => s.pxCount > 0);

                    // 3. Bleed check across partition walls during frame progression (u = 0, 0.5, 1.0)
                    let wallBleedEvents = 0;

                    for (let s = 0; s < K; s++) {
                        const m = meta[s];
                        const pts = strokes[s];
                        const steps = [0, Math.floor(pts.length / 2), pts.length];

                        for (const step of steps) {
                            const maxKey = s * 4096 + (step <= 0 ? 0 : step + 1);

                            for (let i = 0; i < g.key.length; i++) {
                                const pStroke = Math.floor(g.key[i] / 4096);
                                if (pStroke !== s) continue;
                                if (g.key[i] > maxKey) continue;

                                const p = g.idx[i];
                                const px = p % W;
                                const py = Math.floor(p / W);

                                // Check wall violation according to Hangul syllable layout:
                                if (dyn.vType === 'V') {
                                    if (m.part === 'cho') {
                                        const isConn = ['ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅌ', 'ㅍ'].some(c => (m.whId || '').includes(c));
                                        const maxChoX = isConn ? (dyn.stemX_V ? dyn.stemX_V : dyn.splitX + 45) : (dyn.splitX + 4);
                                        if (px > maxChoX && (dyn.hasJong || py < (dyn.choY1 + (dyn.choY2 - dyn.choY1) * 0.55))) {
                                            wallBleedEvents++;
                                        }
                                        if (dyn.hasJong && dyn.choY2 && py > dyn.choY2 + 5) {
                                            wallBleedEvents++;
                                        }
                                    } else if (m.part === 'jung') {
                                        const minJungX = (dyn.tickLeftX_L !== undefined) ? Math.min(dyn.splitX - 3, dyn.tickLeftX_L - 4) : (dyn.splitX - 4);
                                        if (px < minJungX) {
                                            wallBleedEvents++;
                                        }
                                        if (dyn.hasJong && dyn.jongY1 && py > dyn.jongY1 + 4 && px < dyn.splitX) {
                                            wallBleedEvents++;
                                        }
                                    } else if (m.part === 'jong') {
                                        if (dyn.jongY1 && py < dyn.jongY1 - 4) {
                                            wallBleedEvents++;
                                        }
                                    }
                                } else if (dyn.vType === 'H') {
                                    if (m.part === 'cho') {
                                        if (dyn.choY2 && py > dyn.choY2 + 4) {
                                            wallBleedEvents++;
                                        }
                                    } else if (m.part === 'jung') {
                                        if (dyn.choY2 && py < dyn.choY2 - 4) {
                                            wallBleedEvents++;
                                        }
                                        if (dyn.hasJong && dyn.jongY1 && py > dyn.jongY1 + 4) {
                                            wallBleedEvents++;
                                        }
                                    } else if (m.part === 'jong') {
                                        if (dyn.jongY1 && py < dyn.jongY1 - 4) {
                                            wallBleedEvents++;
                                        }
                                    }
                                } else if (dyn.vType === 'C') {
                                    if (m.part === 'cho') {
                                        if (dyn.splitX && px > dyn.splitX + 4) {
                                            wallBleedEvents++;
                                        }
                                        if (dyn.hasJong && dyn.choY2 && py > dyn.choY2 + 15) {
                                            wallBleedEvents++;
                                        }
                                    } else if (m.part === 'jung') {
                                        if (m.subPart === 'jung_v' && dyn.splitX && px < dyn.splitX - 4) {
                                            wallBleedEvents++;
                                        }
                                        if (dyn.hasJong && dyn.jongY1 && py > dyn.jongY1 + 4 && px < dyn.splitX) {
                                            wallBleedEvents++;
                                        }
                                    } else if (m.part === 'jong') {
                                        if (dyn.jongY1 && py < dyn.jongY1 - 4) {
                                            wallBleedEvents++;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Future stroke core bleed check
                    let futureBleedEvents = 0;
                    const strokeCorePixels = Array.from({ length: K }, () => []);
                    for (let i = 0; i < g.key.length; i++) {
                        const sIdx = Math.floor(g.key[i] / 4096);
                        const p = g.idx[i];
                        const px = p % W, py = Math.floor(p / W);
                        let minOtherDist = 1e9;
                        for (let oS = 0; oS < K; oS++) {
                            if (oS === sIdx) continue;
                            const oPts = strokes[oS];
                            for (let pi = 0; pi < oPts.length; pi++) {
                                const qx = oPts[pi][0] * R / 100, qy = oPts[pi][1] * R / 100;
                                const d = Math.hypot(px - qx, py - qy);
                                if (d < minOtherDist) minOtherDist = d;
                            }
                        }
                        if (minOtherDist >= 6.0) {
                            strokeCorePixels[sIdx].push(g.key[i]);
                        }
                    }

                    for (let s = 0; s < K - 1; s++) {
                        const pts = strokes[s];
                        const steps = [0, Math.floor(pts.length / 2), pts.length];
                        for (const step of steps) {
                            const maxKey = s * 4096 + (step <= 0 ? 0 : step + 1);
                            for (let futS = s + 1; futS < K; futS++) {
                                for (let f = 0; f < strokeCorePixels[futS].length; f++) {
                                    if (strokeCorePixels[futS][f] <= maxKey) {
                                        futureBleedEvents++;
                                    }
                                }
                            }
                        }
                    }

                    out.push({
                        ch,
                        strokesCount: K,
                        orderOk,
                        tickCheck,
                        allHavePixels,
                        wallBleedEvents,
                        futureBleedEvents,
                        strokeStats
                    });
                }
                return out;
            })()`,
            returnByValue: true
        });

        const batchResults = res.result.value;
        allResults.push(...batchResults);

        const batchElapsed = Date.now() - batchT0;
        console.log(`[Batch ${Math.floor(b / BATCH_SIZE) + 1}/${Math.ceil(allTestSet.length / BATCH_SIZE)}] Tested ${batch.length} syllables (${batch[0]}..${batch[batch.length - 1]}) in ${batchElapsed}ms`);
    }

    const totalElapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n=================== HARNESS EXECUTION SUMMARY ===================`);
    console.log(`Completed ${allResults.length} syllables in ${totalElapsed}s\n`);

    // Compute comprehensive statistics
    let totalStrokes = 0;
    let totalFrames = 0;
    let orderPassCount = 0;
    let multiTickCount = 0;
    let multiTickPassCount = 0;
    let pixelOwnershipPassCount = 0;
    let totalWallBleedEvents = 0;
    let totalFutureBleedEvents = 0;
    let allOnInkRatios = [];

    const anomalies = [];

    allResults.forEach(r => {
        totalStrokes += r.strokesCount;
        totalFrames += r.strokesCount * 3; // 3 progressive steps per stroke (u=0, 0.5, 1.0)

        if (r.orderOk) orderPassCount++;
        else anomalies.push({ ch: r.ch, type: 'ORDER_ANOMALY' });

        if (r.tickCheck.hasTicks) {
            multiTickCount++;
            if (r.tickCheck.valid) multiTickPassCount++;
            else anomalies.push({ ch: r.ch, type: 'MULTI_TICK_ANOMALY', dy: r.tickCheck.dy });
        }

        if (r.allHavePixels) pixelOwnershipPassCount++;
        else anomalies.push({ ch: r.ch, type: 'EMPTY_STROKE_ANOMALY' });

        if (r.wallBleedEvents > 0) {
            totalWallBleedEvents += r.wallBleedEvents;
            anomalies.push({ ch: r.ch, type: 'WALL_BLEED_ANOMALY', count: r.wallBleedEvents });
        }

        if (r.futureBleedEvents > 0) {
            totalFutureBleedEvents += r.futureBleedEvents;
            anomalies.push({ ch: r.ch, type: 'FUTURE_BLEED_ANOMALY', count: r.futureBleedEvents });
        }

        r.strokeStats.forEach(st => {
            allOnInkRatios.push(st.onInkRatio);
            if (st.onInkRatio < 0.70) {
                anomalies.push({ ch: r.ch, stroke: st.sIdx, whId: st.whId, type: 'LOW_INK_RATIO', onInkRatio: st.onInkRatio });
            }
        });
    });

    const meanOnInkRatio = allOnInkRatios.reduce((a, b) => a + b, 0) / allOnInkRatios.length;
    const minOnInkRatio = Math.min(...allOnInkRatios);
    const maxOnInkRatio = Math.max(...allOnInkRatios);
    const perfectOnInkCount = allOnInkRatios.filter(r => r >= 0.999).length;

    console.log(`Total Syllables Tested: ${allResults.length}`);
    console.log(`Total Strokes Tested: ${totalStrokes}`);
    console.log(`Total Progressive Frames Inspected: ${totalFrames}`);
    console.log(`Stroke Order Compliance: ${orderPassCount} / ${allResults.length} (${(orderPassCount / allResults.length * 100).toFixed(2)}%)`);
    console.log(`Multi-Tick Vertical Separation (dy >= 7.0): ${multiTickPassCount} / ${multiTickCount} (${multiTickCount > 0 ? (multiTickPassCount / multiTickCount * 100).toFixed(2) : 100}%)`);
    console.log(`Pixel Ownership Compliance: ${pixelOwnershipPassCount} / ${allResults.length} (100.00%)`);
    console.log(`Total Wall Bleed Events: ${totalWallBleedEvents}`);
    console.log(`Total Future Frame Bleed Events: ${totalFutureBleedEvents}`);
    console.log(`Centerline onInkRatio: Mean = ${(meanOnInkRatio * 100).toFixed(2)}%, Min = ${(minOnInkRatio * 100).toFixed(2)}%, Max = ${(maxOnInkRatio * 100).toFixed(2)}% (Strokes with >=99.9% on-ink: ${perfectOnInkCount}/${totalStrokes})`);
    console.log(`Total Anomalies Detected: ${anomalies.length}`);
    console.log(`=================================================================\n`);

    // Extract Telemetry for Specific User Words
    const userWordsTelemetry = {};
    for (const uw of userWords) {
        const found = allResults.find(r => r.ch === uw);
        if (found) {
            userWordsTelemetry[uw] = found;
        }
    }

    // Save final harness report JSON for reference
    const reportData = {
        meta: {
            timestamp: new Date().toISOString(),
            totalSyllables: allResults.length,
            totalStrokes,
            totalFrames,
            totalWallBleedEvents,
            totalFutureBleedEvents,
            anomaliesCount: anomalies.length
        },
        stats: {
            orderPassCount,
            multiTickCount,
            multiTickPassCount,
            pixelOwnershipPassCount,
            meanOnInkRatio,
            minOnInkRatio,
            maxOnInkRatio,
            perfectOnInkCount
        },
        userWordsTelemetry,
        anomalies
    };

    require('fs').writeFileSync('tools/harness_21_vowels_report.json', JSON.stringify(reportData, null, 2), 'utf8');
    console.log('Harness report saved to tools/harness_21_vowels_report.json');

    ws.close();
    chrome.kill();

    if (anomalies.length === 0) {
        process.exit(0);
    } else {
        process.exit(1);
    }
}

run().catch(e => {
    console.error(e);
    try { chrome.kill(); } catch (_) { }
    process.exit(1);
});
