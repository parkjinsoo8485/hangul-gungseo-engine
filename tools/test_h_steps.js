const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_h_test_' + PORT, 'about:blank'
], { stdio: 'ignore' });
const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    let list;
    for (let i = 0; i < 40; i++) { try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { } await sleep(250); }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r.result); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2000);

    const artifactDir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d';

    // Check what happens when drawing stroke 0
    const testCases = [
        { name: 's0_mid', stroke: 0, step: 10 },
        { name: 's0_end', stroke: 0, step: 9999 },
        { name: 's1_mid', stroke: 1, step: 10 },
        { name: 's1_end', stroke: 1, step: 9999 },
        { name: 's2_mid', stroke: 2, step: 50 },
        { name: 's2_end', stroke: 2, step: 9999 }
    ];

    for (const tc of testCases) {
        const data = await send('Runtime.evaluate', {
            expression: `(() => {
                Engine.loadText('획');
                Engine.stopDemo();
                Engine.currentStroke = ${tc.stroke};
                Engine.currentStep = ${tc.step};
                Engine.renderGlyphInk();
                Engine.renderScene();

                // Check which pixels in glyphImg are painted
                const cv = document.getElementById('glyph-canvas');
                const ctx = cv.getContext('2d');
                const imgData = ctx.getImageData(0, 0, cv.width, cv.height).data;
                const black = [];
                for (let y = 0; y < cv.height; y++) {
                    for (let x = 0; x < cv.width; x++) {
                        const o = (y * cv.width + x) * 4;
                        if (imgData[o+3] > 100 && imgData[o] < 50) {
                            black.push([x, y]);
                        }
                    }
                }
                const minX = black.length ? Math.min(...black.map(p=>p[0])) : 0;
                const maxX = black.length ? Math.max(...black.map(p=>p[0])) : 0;
                const minY = black.length ? Math.min(...black.map(p=>p[1])) : 0;
                const maxY = black.length ? Math.max(...black.map(p=>p[1])) : 0;
                return {
                    name: '${tc.name}',
                    blackCount: black.length,
                    minX, maxX, minY, maxY
                };
            })()`,
            returnByValue: true
        });
        console.log(tc.name, data.result.value);
    }

    ws.close(); chrome.kill(); process.exit(0);
})();
