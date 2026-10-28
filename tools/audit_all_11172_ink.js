const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9976;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_all_' + PORT,
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1800);

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
    const t0 = Date.now();

    for (let offset = 0; offset < TOTAL; offset += BATCH) {
        const count = Math.min(BATCH, TOTAL - offset);
        const batchFailures = await evalJs(`(() => {
            const R = 150, s = R / 100;
            const ff = Engine.styleParams.fontFamily;
            const ctx = window.__auditCtx;
            const failures = [];

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

                ctx.clearRect(0, 0, R, R);
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
                ctx.fillText(ch, R / 2, R / 2);
                const d = ctx.getImageData(0, 0, R, R).data;

                Engine.strokes.forEach((rawPts, sIdx) => {
                    const meta = Engine.strokeMeta[sIdx];
                    const len0 = rawPts.length;
                    if (len0 === 0) {
                        failures.push({ ch, sIdx: sIdx + 1, part: meta?.part, ratio: 0, reason: '0_pts' });
                        return;
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
                            ratio,
                            fbox: entry?.fbox ? entry.fbox.map(v => Math.round(v*10)/10) : null
                        });
                    }
                });
            }
            return failures;
        })()`);

        allFailures.push(...batchFailures);
        const done = offset + count;
        if (done % 1500 === 0 || done === TOTAL) {
            const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
            console.log(`Progress: ${done} / ${TOTAL} (${elapsed}s) - Cumulative issues: ${allFailures.length}`);
        }
    }

    console.log('\n=== 11,172 FULL HANGUL AUDIT COMPLETE ===');
    console.log(`Total syllables audited: ${TOTAL}`);
    console.log(`Total stroke issues (<70% on ink): ${allFailures.length}`);
    fs.writeFileSync('tools/all_11172_failures.json', JSON.stringify(allFailures, null, 2));

    if (allFailures.length > 0) {
        const countsByWhId = {};
        allFailures.forEach(f => {
            const k = f.whId || f.part || 'unknown';
            countsByWhId[k] = (countsByWhId[k] || 0) + 1;
        });
        const sorted = Object.entries(countsByWhId).sort((a, b) => b[1] - a[1]);
        console.log('\nTop affected Jamo parts (whId):');
        sorted.slice(0, 10).forEach(([k, cnt]) => {
            const eg = allFailures.find(f => f.whId === k);
            console.log(`  ${k}: ${cnt} occurrences (e.g. "${eg?.ch}" s${eg?.sIdx} -> ${eg?.ratio}% onInk, fbox=${JSON.stringify(eg?.fbox)})`);
        });
    }

    ws.close();
    chrome.kill();
    process.exit(allFailures.length === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Audit fatal error:', err);
    chrome.kill();
    process.exit(2);
});
