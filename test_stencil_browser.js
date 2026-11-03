const { spawn } = require('child_process');
const http = require('http');

const PORT = 9965;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT,
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
        await sleep(200);
    }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => {
            const r = JSON.parse(data);
            if (r.id === reqId) { 
                ws.removeEventListener('message', onMsg); 
                if (r.error) rej(r.error); else res(r.result); 
            }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });

    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Runtime.enable');

    const consoleErrors = [];
    ws.addEventListener('message', ({ data }) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
            consoleErrors.push({ type: 'console.error', args: msg.params.args.map(a => a.value) });
        } else if (msg.method === 'Runtime.exceptionThrown') {
            consoleErrors.push({ type: 'EXCEPTION', desc: msg.params.exceptionDetails.exception.description });
        }
    });

    const fileUrl = 'file:///' + 'c:/한글획순/sample_stencil_demo.html'.replace(/\\/g, '/');
    console.log('[1] Loading page:', fileUrl);
    await send('Page.navigate', { url: fileUrl });
    await sleep(800);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) {
            console.error('Eval error:', r.exceptionDetails);
        }
        return r.result.value;
    };

    const countInkPixels = async () => {
        return await evalJs(`
            (() => {
                const canvas = document.getElementById('ink-canvas');
                const ctx = canvas.getContext('2d');
                const imgData = ctx.getImageData(0, 0, 360, 360);
                let count = 0;
                for (let i = 3; i < imgData.data.length; i += 4) {
                    if (imgData.data[i] > 20) count++;
                }
                return count;
            })()
        `);
    };

    // 1. Test Auto Play
    console.log('[2] Testing Auto Play for ㄹ...');
    await evalJs('selectJamo("ㄹ")');
    await evalJs('document.getElementById("btn-play").click()');
    
    // Check pixel growth during animation
    await sleep(500);
    const p1 = await countInkPixels();
    console.log('    Pixel count at 500ms:', p1);
    await sleep(1000);
    const p2 = await countInkPixels();
    console.log('    Pixel count at 1500ms:', p2);
    await sleep(1200);
    const pFinal = await countInkPixels();
    const badgeText = await evalJs('document.getElementById("status-badge").textContent');
    console.log('    Finished pixel count:', pFinal, '| Badge:', badgeText);

    if (p1 === 0 || p2 === 0 || pFinal === 0) {
        throw new Error('FAIL: Ink pixel count was 0 during animation!');
    }
    if (!badgeText.includes('참 잘했어요')) {
        throw new Error('FAIL: Animation did not complete: ' + badgeText);
    }

    // 2. Test Interactive Quiz simulation
    console.log('[3] Testing Interactive Quiz simulation for ㄹ...');
    await evalJs('document.getElementById("btn-quiz").click()');
    await sleep(200);

    // Simulate stroke 1
    const s1Res = await evalJs(`
        (() => {
            const wrap = document.getElementById('canvas-wrap');
            const pt1 = toCanvasCoord(JAMO_DATA['ㄹ'].strokes[0][0]);
            const pt2 = toCanvasCoord(JAMO_DATA['ㄹ'].strokes[0][1]);
            const pt3 = toCanvasCoord(JAMO_DATA['ㄹ'].strokes[0][2]);

            const r = wrap.getBoundingClientRect();
            wrap.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + pt1.x, clientY: r.top + pt1.y, bubbles: true }));
            wrap.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + pt2.x, clientY: r.top + pt2.y, bubbles: true }));
            wrap.dispatchEvent(new PointerEvent('pointermove', { clientX: r.left + pt3.x, clientY: r.top + pt3.y, bubbles: true }));
            wrap.dispatchEvent(new PointerEvent('pointerup', { clientX: r.left + pt3.x, clientY: r.top + pt3.y, bubbles: true }));

            return {
                strokeIdx: currentStrokeIdx,
                badge: document.getElementById('status-badge').textContent
            };
        })()
    `);
    console.log('    Quiz Stroke 1 completed:', s1Res);
    if (s1Res.strokeIdx !== 1) {
        throw new Error('FAIL: Quiz stroke 1 failed: ' + JSON.stringify(s1Res));
    }

    // 3. Test all other 13 consonants
    console.log('[4] Verifying all 14 consonants render properly...');
    const allJamos = ['ㄱ', 'ㄴ', 'ㄷ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    for (const j of allJamos) {
        await evalJs(`selectJamo("${j}")`);
        await evalJs('document.getElementById("btn-play").click()');
        await sleep(500);
        const px = await countInkPixels();
        if (px === 0) {
            throw new Error(`FAIL: Consonant ${j} rendered 0 pixels!`);
        }
        console.log(`    Consonant ${j}: SUCCESS (${px} px)`);
    }

    console.log('[5] Checking browser console errors...');
    if (consoleErrors.length > 0) {
        throw new Error('FAIL: Console errors: ' + JSON.stringify(consoleErrors));
    }

    console.log('=== ALL BROWSER CHECKS PASSED WITH 100% SUCCESS ===');
    try { chrome.kill(); } catch (e) {}
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    try { chrome.kill(); } catch (e) {}
    process.exit(1);
});
