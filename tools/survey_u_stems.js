const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_u_survey_' + PORT, 'about:blank'
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

    const testChars = ['순', '문', '눈', '물', '국', '군'];
    const results = {};

    for (const ch of testChars) {
        const res = await send('Runtime.evaluate', {
            expression: `(() => {
                document.getElementById('char-input').value = '${ch}';
                Engine.loadText('${ch}');
                
                // Find ㅜ strokes (there are 2 strokes for ㅜ)
                // Let's find the vertical stem stroke of ㅜ
                const stemStroke = Engine.strokes.find((s, idx) => {
                    const m = Engine.strokeMeta && Engine.strokeMeta[idx];
                    return m && m.part === 'jung' && Math.abs(s[s.length-1][0] - s[0][0]) < 2.0 && Math.abs(s[s.length-1][1] - s[0][1]) > 5.0;
                });

                const cv = document.createElement('canvas');
                cv.width = 360; cv.height = 360;
                const ctx = cv.getContext('2d');
                ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.font = 'normal 292px ' + Engine.styleParams.fontFamily;
                ctx.fillText('${ch}', 180, 180);
                const img = ctx.getImageData(0, 0, 360, 360).data;

                const col = stemStroke ? Math.round(stemStroke[0][0] * 3.6) : 180;
                let topY = null, botY = null;
                for (let y = 140; y <= 290; y++) {
                    let hasInk = false;
                    for (let x = col - 4; x <= col + 4; x++) {
                        if (img[(y * 360 + x) * 4 + 3] > 60) { hasInk = true; break; }
                    }
                    if (hasInk) {
                        if (topY === null) topY = y;
                        botY = y;
                    }
                }

                return {
                    centerlineStart: stemStroke ? stemStroke[0][1].toFixed(1) : null,
                    centerlineEnd: stemStroke ? stemStroke[stemStroke.length - 1][1].toFixed(1) : null,
                    inkTopPercent: topY ? (topY / 3.6).toFixed(1) : null,
                    inkBotPercent: botY ? (botY / 3.6).toFixed(1) : null
                };
            })()`,
            returnByValue: true
        });
        results[ch] = res.result.value;
    }

    console.log(JSON.stringify(results, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
