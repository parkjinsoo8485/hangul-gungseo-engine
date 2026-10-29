const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9976;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_super_' + PORT,
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
        await sleep(250);
    }

    console.log('===================================================================');
    console.log('  SUPER-PRECISION 11,172 HANGUL AUDIT (CENTERLINE + AIR-LEAK + BLEED)');
    console.log('===================================================================');

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    const BATCH = 500;
    const allDefects = [];
    const t0 = Date.now();

    for (let start = 0xAC00; start <= 0xD7A3; start += BATCH) {
        const end = Math.min(0xD7A3, start + BATCH - 1);
        const defects = await evalJs(`(() => {
            const out = [];
            for (let code = ${start}; code <= ${end}; code++) {
                const ch = String.fromCharCode(code);
                Engine.loadText(ch);
                const strokes = Engine.strokes;
                const meta = Engine.strokeMeta || [];
                const g = Engine.glyphData;
                if (!g) continue;
                const R = g.R, W = g.W;
                const jb = (Engine.dynBounds && Engine.dynBounds[0]) || (Engine.jamoBoxes && Engine.jamoBoxes[0]) || {};

                // 1. Check if any stroke penetrates into another stroke's territory
                // e.g., cho stroke extending across splitX or into vertical stems
                strokes.forEach((pts, sIdx) => {
                    const m = meta[sIdx] || {};
                    const lastPt = pts[pts.length - 1];
                    const firstPt = pts[0];

                    // Check cho horiz stroke overshooting into right vowel stem
                    if (m.part === 'cho' && (m.vType === 'C' || m.vType === 'V')) {
                        const splitX = jb.splitX ? (jb.splitX * 100 / R) : 55;
                        const maxChoX = Math.max(...pts.map(p => p[0]));
                        if (maxChoX > splitX + 3.0) {
                            out.push({
                                ch, sIdx: sIdx + 1, code: code.toString(16),
                                type: 'CHO_OVERSHOOT_INTO_VOWEL',
                                maxChoX, splitX,
                                whId: m.whId
                            });
                        }
                    }

                    // Check if stroke points fall into empty air (air leak)
                    // Sample 5 points along stroke and check font alpha
                    let airPoints = 0;
                    const step = Math.max(1, Math.floor(pts.length / 6));
                    for (let pi = 1; pi < pts.length - 1; pi += step) {
                        const px = Math.round(pts[pi][0] * R / 100);
                        const py = Math.round(pts[pi][1] * R / 100);
                        const pIdx = py * W + px;
                        const idx = g.idx.indexOf(pIdx);
                        if (idx < 0 || g.a[idx] < 20) {
                            airPoints++;
                        }
                    }
                    if (airPoints >= 3) {
                        out.push({
                            ch, sIdx: sIdx + 1, code: code.toString(16),
                            type: 'AIR_LEAK_POINTS',
                            airPoints, totalPts: pts.length,
                            whId: m.whId
                        });
                    }
                });
            }
            return out;
        })()`);

        if (defects.length > 0) {
            allDefects.push(...defects);
            console.log(`[Batch 0x${start.toString(16)}..0x${end.toString(16)}] Found ${defects.length} defect(s):`, defects.slice(0, 3));
        }

        const pct = Math.round(((end - 0xAC00 + 1) / 11172) * 100);
        console.log(`Progress: ${end - 0xAC00 + 1} / 11172 (${pct}%) - Cumulative defects: ${allDefects.length}`);
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\nAudit completed in ${elapsed}s. Total defects found: ${allDefects.length}`);
    fs.writeFileSync('tools/super_precision_defects.json', JSON.stringify(allDefects, null, 2), 'utf8');

    ws.close();
    chrome.kill();
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
