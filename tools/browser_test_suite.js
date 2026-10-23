const { spawn } = require('child_process'), fs = require('fs'), http = require('http'), path = require('path');
const PORT = 9955;
const USER_DATA = path.join(process.env.TEMP, 'cdp_rec_' + PORT);

console.log('Launching Chrome browser engine via CDP on port ' + PORT + '...');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + USER_DATA,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    let list;
    for (let i = 0; i < 40; i++) {
        try {
            list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list'));
            if (list.length) break;
        } catch (e) { }
        await sleep(250);
    }
    if (!list || !list.length) throw new Error('Failed to connect to Chrome on port ' + PORT);

    const target = list.find(t => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
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
    await sleep(2000);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        return r.result.value;
    };

    const TEST_WORDS = [
        '획순',
        '훈민정음',
        '대한민국',
        '궁서체',
        '꽃밭',
        '밝은달',
        '환희'
    ];

    const results = [];
    const outDir = 'C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e';

    for (const word of TEST_WORDS) {
        console.log(`\n========================================`);
        console.log(`[Browser Engine] Testing Word: "${word}"`);
        console.log(`========================================`);

        // Type word into the input box on the real page UI
        await evalJs(`
            (function() {
                const inp = document.getElementById('char-input');
                inp.value = '${word}';
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                Engine.loadText('${word}');
            })()
        `);
        await sleep(800);

        // Run comprehensive 100% verification checks
        const check = await evalJs(`
            (function() {
                const g = Engine.glyphData;
                const strokes = Engine.strokes;
                const badges = Engine.badgePositions || [];
                
                // 1. Zero pixel stroke check
                const counts = new Array(strokes.length).fill(0);
                for (let i = 0; i < g.sid.length; i++) {
                    counts[g.sid[i]]++;
                }
                const zeroPixelStrokes = [];
                counts.forEach((c, idx) => { if (c === 0) zeroPixelStrokes.push(idx); });

                // 2. Monotonic order check
                let monotonic = true;
                for (let i = 1; i < g.key.length; i++) {
                    if (g.key[i] < g.key[i - 1]) { monotonic = false; break; }
                }

                // 3. Connected components (Split stroke check)
                const splitStrokes = [];
                for (let s = 0; s < strokes.length; s++) {
                    const sPix = [];
                    for (let i = 0; i < g.sid.length; i++) {
                        if (g.sid[i] === s) {
                            const p = g.idx[i];
                            sPix.push([p % g.W, (p / g.W) | 0]);
                        }
                    }
                    if (sPix.length === 0) continue;
                    const pSet = new Set(sPix.map(([x, y]) => x + ',' + y));
                    let sigComps = 0;
                    const v2 = new Set();
                    for (const [x, y] of sPix) {
                        const k = x + ',' + y;
                        if (v2.has(k)) continue;
                        const q = [[x, y]];
                        v2.add(k);
                        let cSize = 0;
                        while (q.length > 0) {
                            const [cx, cy] = q.pop();
                            cSize++;
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    if (dx === 0 && dy === 0) continue;
                                    const nk = (cx + dx) + ',' + (cy + dy);
                                    if (pSet.has(nk) && !v2.has(nk)) {
                                        v2.add(nk);
                                        q.push([cx + dx, cy + dy]);
                                    }
                                }
                            }
                        }
                        if (cSize >= 15) sigComps++;
                    }
                    if (sigComps > 1) splitStrokes.push({ stroke: s, sigComps });
                }

                // 4. Badge distance check (no overlapping badges, dist >= 5.0)
                let badgeOverlaps = 0;
                for (let a = 0; a < badges.length; a++) {
                    for (let b = a + 1; b < badges.length; b++) {
                        const d = Math.hypot(badges[a].bx - badges[b].bx, badges[a].by - badges[b].by);
                        if (d < 5.0) badgeOverlaps++;
                    }
                }

                return {
                    charCount: Engine.charCount,
                    totalStrokes: strokes.length,
                    totalInkPixels: g.idx.length,
                    zeroPixelStrokes,
                    splitStrokes,
                    monotonic,
                    badgeOverlaps,
                    pixelCounts: counts
                };
            })()
        `);

        console.log(` - Total strokes: ${check.totalStrokes}`);
        console.log(` - Total ink pixels: ${check.totalInkPixels}`);
        console.log(` - Zero-pixel strokes: ${check.zeroPixelStrokes.length} (${check.zeroPixelStrokes.length === 0 ? 'PASS' : 'FAIL'})`);
        console.log(` - Split strokes: ${check.splitStrokes.length} (${check.splitStrokes.length === 0 ? 'PASS' : 'FAIL'})`);
        console.log(` - Monotonic reveal: ${check.monotonic ? 'PASS' : 'FAIL'}`);
        console.log(` - Badge overlaps: ${check.badgeOverlaps} (${check.badgeOverlaps === 0 ? 'PASS' : 'FAIL'})`);

        // Capture screenshot of the browser canvas
        const clip = await evalJs(`
            (function() {
                const c = document.getElementById('main-canvas');
                const r = c.getBoundingClientRect();
                return { x: r.left, y: r.top, width: r.width, height: r.height, scale: 1 };
            })()
        `);
        const shot = await send('Page.captureScreenshot', { clip });
        const shotFileName = `browser_verify_${word}.png`;
        fs.writeFileSync(path.join(outDir, shotFileName), Buffer.from(shot.data, 'base64'));
        console.log(` - Captured screenshot: ${shotFileName}`);

        const passed = check.zeroPixelStrokes.length === 0 &&
                       check.splitStrokes.length === 0 &&
                       check.monotonic === true &&
                       check.badgeOverlaps === 0;

        results.push({
            word,
            strokes: check.totalStrokes,
            pixels: check.totalInkPixels,
            zeroPixel: check.zeroPixelStrokes.length,
            split: check.splitStrokes.length,
            monotonic: check.monotonic,
            badgeOverlaps: check.badgeOverlaps,
            passed
        });
    }

    console.log(`\n========================================`);
    console.log(`[Summary of Browser Verifications]`);
    console.log(`========================================`);
    let allPass = true;
    results.forEach(r => {
        console.log(`Word: "${r.word.padEnd(6, ' ')}" | Strokes: ${r.strokes.toString().padStart(2, ' ')} | Pixels: ${r.pixels.toString().padStart(5, ' ')} | ZeroPx: ${r.zeroPixel} | Split: ${r.split} | Mono: ${r.monotonic} | BadgeOverlaps: ${r.badgeOverlaps} | Result: ${r.passed ? '✅ PASS' : '❌ FAIL'}`);
        if (!r.passed) allPass = false;
    });

    console.log(`\nFinal Verdict: ${allPass ? '🎉 100% ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}`);

    chrome.kill();
    process.exit(allPass ? 0 : 1);
}

main().catch(e => {
    console.error('Browser Test Error:', e);
    try { chrome.kill(); } catch (err) { }
    process.exit(1);
});
