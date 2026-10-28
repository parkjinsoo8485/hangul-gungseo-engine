const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_fixes_' + PORT, 'about:blank'
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

    // Let's test the fix on '획' and '순'
    const evalCode = `(() => {
        // We can inspect computeDynamicJamoBounds for '순'
        const cv = document.createElement('canvas');
        cv.width = 360; cv.height = 360;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'normal 292px ' + Engine.styleParams.fontFamily;
        ctx.fillText('순', 180, 180);
        const img = ctx.getImageData(0, 0, 360, 360).data;
        const jb = computeDynamicJamoBounds(img, 0, 1, 360, { cho: 'ㅅ', jung: 'ㅜ', jong: 'ㄴ' }, 'H', true);
        
        // Test scan down
        const cX = Math.round(jb.stemX_U);
        let stemBot = jb.jungY1;
        for (let y = Math.round(jb.jungY1); y <= jb.maxY; y++) {
            let hasInk = false;
            for (let dx = -3; dx <= 3; dx++) {
                if (img[(y * 360 + cX + dx) * 4 + 3] > 60) { hasInk = true; break; }
            }
            if (hasInk) stemBot = y;
            else if (y > jb.jungY1 + 15) break;
        }

        return { jb, cX, stemBot, stemBotPercent: (stemBot / 3.6).toFixed(2) };
    })()`;

    const res = await send('Runtime.evaluate', { expression: evalCode, returnByValue: true });
    console.log("Current jb for 순:", JSON.stringify(res.result.value, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
