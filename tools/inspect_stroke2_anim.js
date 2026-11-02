const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9993;
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
        await sleep(250);
    }

    const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

    const data = await evalJs(`(() => {
        Engine.loadText('닮');
        const g = Engine.glyphData;
        const R = g.R, W = g.W;

        // Check pixel assignment around the horizontal bar y = 145 to 175
        const strokeGrid = [];
        for (let y = Math.round(R * 0.40); y <= Math.round(R * 0.48); y += 3) {
            let row = y.toString().padStart(3) + ' ';
            for (let x = Math.round(R * 0.20); x <= Math.round(R * 0.85); x += 3) {
                const idx = g.idx.indexOf(y * W + x);
                if (idx >= 0) {
                    const s = Math.floor(g.key[idx] / 4096);
                    row += (s + 1);
                } else {
                    row += ' ';
                }
            }
            strokeGrid.push(row);
        }

        // Simulate animation: At step = 100% of stroke 2, what pixels are drawn?
        Engine.resetPractice();
        Engine.currentStroke = 1; // 0-based: stroke 2
        Engine.currentStep = Engine.strokes[1].length;
        Engine.renderGlyphInk();
        const cv = document.getElementById('glyph-canvas');
        const ctx = cv.getContext('2d');
        const imgD = ctx.getImageData(0, 0, cv.width, cv.height).data;
        let drawnRightmostX = 0;
        for (let y = 0; y < cv.height; y++) {
            for (let x = 0; x < cv.width; x++) {
                if (imgD[(y * cv.width + x) * 4 + 3] > 100) {
                    if (x > drawnRightmostX) drawnRightmostX = x;
                }
            }
        }

        return {
            strokeGrid,
            drawnRightmostX: (drawnRightmostX / cv.width * 100).toFixed(1),
            s2_last: Engine.strokes[1][Engine.strokes[1].length - 1],
            s3_stemX: Engine.strokes[2][0][0],
            s4_first: Engine.strokes[3][0],
            s4_last: Engine.strokes[3][Engine.strokes[3].length - 1]
        };
    })()`);

    console.log('=== STROKE KEY ASSIGNMENT ===');
    console.log(data.strokeGrid.join('\n'));
    console.log('\n=== ANIMATION AT END OF STROKE 2 ===');
    console.log('Drawn rightmost X%:', data.drawnRightmostX);
    console.log('s2_last:', data.s2_last);
    console.log('s3_stemX:', data.s3_stemX);
    console.log('s4_first:', data.s4_first);
    console.log('s4_last:', data.s4_last);

    ws.close();
    chrome.kill();
}
main().catch(console.error);
