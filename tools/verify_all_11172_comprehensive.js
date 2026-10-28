const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9975;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_comp_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
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
    await send('Page.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2000);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    await evalJs(`
        window.__auditCanvas = document.createElement('canvas');
        window.__auditCanvas.width = 150;
        window.__auditCanvas.height = 150;
        window.__auditCtx = window.__auditCanvas.getContext('2d', { willReadFrequently: true });
        Engine.stopDemo();
    `);

    const TOTAL = 11172;
    const START_CODE = 0xAC00;
    const BATCH = 300;
    const allFailures = [];
    const stats = {
        totalSyllables: TOTAL,
        totalStrokesChecked: 0,
        zeroStrokeFailures: 0,
        nanCoordFailures: 0,
        onInkFailures: 0,
        glyphDataPixelFailures: 0,
        distributionByVowel: {}
    };

    const t0 = Date.now();

    for (let offset = 0; offset < TOTAL; offset += BATCH) {
        const count = Math.min(BATCH, TOTAL - offset);
        const batchResult = await evalJs(`(() => {
            const R = 150, s = R / 100;
            const ff = Engine.styleParams.fontFamily;
            const ctx = window.__auditCtx;
            const failures = [];
            let strokesCount = 0;

            for (let k = 0; k < ${count}; k++) {
                const code = ${START_CODE + offset} + k;
                const ch = String.fromCharCode(code);

                const info = decomposeHangul(ch);
                Engine.charCount = 1;
                Engine.charsInfo = [info];
                const vType = VOWEL_TYPE[info.jung] || 'V';
                const hasJong = !!info.jong;
                Engine.jamoEntries = WH.buildEntries(info, 0, vType, hasJong);
                Engine.fitKey = null;
                Engine.fitEntriesToGlyph();
                Engine.entriesToRaw();
                const flatRaw = Engine.rawCharStrokes.flat();
                Engine.strokes = flatRaw.map(rawCtrl => buildProceduralStrokePoints(rawCtrl, Engine.styleParams));

                strokesCount += Engine.strokes.length;

                // 1. 글자 폰트 렌더링
                ctx.clearRect(0, 0, R, R);
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
                ctx.fillText(ch, R / 2, R / 2);
                const d = ctx.getImageData(0, 0, R, R).data;

                // 2. 각 획별 정밀 검증
                Engine.strokes.forEach((rawPts, sIdx) => {
                    const meta = Engine.strokeMeta[sIdx];
                    const len0 = rawPts.length;
                    if (len0 === 0) {
                        failures.push({ ch, sIdx: sIdx + 1, part: meta?.part, type: 'ZERO_PTS', ratio: 0 });
                        return;
                    }

                    // NaN 좌표 검사
                    for (let pIdx = 0; pIdx < len0; pIdx++) {
                        const pt = rawPts[pIdx];
                        if (isNaN(pt[0]) || isNaN(pt[1]) || pt[0] < -20 || pt[0] > 150 || pt[1] < -20 || pt[1] > 150) {
                            failures.push({ ch, sIdx: sIdx + 1, part: meta?.part, type: 'INVALID_COORD', pt });
                            return;
                        }
                    }

                    const ptHit = p => {
                        const px = Math.round(p[0] * s), py = Math.round(p[1] * s);
                        for (let dy = -3; dy <= 3; dy++) {
                            for (let dx = -3; dx <= 3; dx++) {
                                const x = px + dx, y = py + dy;
                                if (x >= 0 && x < R && y >= 0 && y < R && d[(y * R + x) * 4 + 3] > 50) return true;
                            }
                        }
                        return false;
                    };

                    let iStart = 0;
                    const maxStartTrim = Math.floor(len0 * 0.22);
                    while (iStart < maxStartTrim && !ptHit(rawPts[iStart])) iStart++;
                    let iEnd = len0 - 1;
                    const minEndTrim = Math.max(iStart + 4, Math.floor(len0 * 0.78));
                    while (iEnd > minEndTrim && !ptHit(rawPts[iEnd])) iEnd--;
                    const pts = (iEnd - iStart + 1 >= Math.max(4, Math.floor(len0 * 0.70))) ? rawPts.slice(iStart, iEnd + 1) : rawPts;
                    const len = pts.length;
                    let onInk = 0;
                    for (let i = 0; i < len; i++) {
                        if (ptHit(pts[i])) onInk++;
                    }
                    const ratio = Math.round((onInk / len) * 1000) / 10;
                    if (ratio < 70) {
                        const entry = Engine.jamoEntries[meta?.ei];
                        failures.push({
                            ch,
                            sIdx: sIdx + 1,
                            part: meta?.part,
                            whId: entry?.whId,
                            type: 'LOW_ON_INK',
                            ratio,
                            fbox: entry?.fbox ? entry.fbox.map(v => Math.round(v*10)/10) : null
                        });
                    }
                });
            }
            return { failures, strokesCount };
        })()`);

        allFailures.push(...batchResult.failures);
        stats.totalStrokesChecked += batchResult.strokesCount;

        const done = offset + count;
        if (done % 1500 === 0 || done === TOTAL) {
            const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
            console.log(`Progress: ${done} / ${TOTAL} (${elapsed}s) - Checked ${stats.totalStrokesChecked} strokes - Cumulative issues: ${allFailures.length}`);
        }
    }

    const totalElapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log('\n======================================================');
    console.log('       11,172 HANGUL COMPREHENSIVE AUDIT REPORT       ');
    console.log('======================================================');
    console.log(`Total syllables verified: ${TOTAL} (U+AC00 ~ U+D7A3)`);
    console.log(`Total strokes verified:   ${stats.totalStrokesChecked}`);
    console.log(`Total execution time:     ${totalElapsed}s`);
    console.log(`Total stroke issues:      ${allFailures.length}`);
    console.log(`Overall Pass Rate:        ${((TOTAL - allFailures.length) / TOTAL * 100).toFixed(2)}%`);
    console.log('======================================================\n');

    fs.writeFileSync('tools/all_11172_comprehensive_report.json', JSON.stringify({
        summary: {
            totalSyllables: TOTAL,
            totalStrokesChecked: stats.totalStrokesChecked,
            totalFailures: allFailures.length,
            passRate: `${((TOTAL - allFailures.length) / TOTAL * 100).toFixed(2)}%`,
            elapsedSeconds: totalElapsed
        },
        failures: allFailures
    }, null, 2));

    ws.close();
    chrome.kill();
    process.exit(allFailures.length === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Audit fatal error:', err);
    chrome.kill();
    process.exit(2);
});
