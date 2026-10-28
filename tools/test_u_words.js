const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_u_stems_' + PORT, 'about:blank'
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

    const testWords = ['순', '숙', '숨', '숭', '술', '수'];
    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const results = {};
            const cv = document.createElement('canvas');
            cv.width = 360; cv.height = 360;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'normal 292px ' + Engine.styleParams.fontFamily;

            for (const w of ${JSON.stringify(testWords)}) {
                ctx.clearRect(0, 0, 360, 360);
                ctx.fillText(w, 180, 180);
                const img = ctx.getImageData(0, 0, 360, 360).data;

                // Call computeDynamicJamoBounds
                const jb = computeDynamicJamoBounds(img, 0, 1, 360, { cho: 'ㅅ', jung: 'ㅜ', jong: w === '수' ? '' : w[1] }, 'H', w !== '수');
                
                const col = jb && jb.stemX_U ? Math.round(jb.stemX_U) : 180;
                // Trace ink down from yBar
                let yBar = jb ? jb.jungY1 : 160;
                let lastInkY = yBar;
                let foundGap = false;
                for (let y = yBar; y < 340; y++) {
                    let hasInk = false;
                    for (let x = col - 3; x <= col + 3; x++) {
                        if (img[(y * 360 + x) * 4 + 3] > 60) { hasInk = true; break; }
                    }
                    if (hasInk) {
                        if (!foundGap) lastInkY = y;
                    } else {
                        if (y > yBar + 15) {
                            foundGap = true;
                            break;
                        }
                    }
                }

                results[w] = {
                    stemCol: col,
                    stemColPercent: (col / 3.6).toFixed(1),
                    yBar: (yBar / 3.6).toFixed(1),
                    lastInkY: (lastInkY / 3.6).toFixed(1),
                    stemSpan: ((lastInkY - yBar) / 3.6).toFixed(1)
                };
            }
            return results;
        })()`,
        returnByValue: true
    });

    console.log(JSON.stringify(res, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
