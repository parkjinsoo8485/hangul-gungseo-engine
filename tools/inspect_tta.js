const { spawn } = require('child_process'), http = require('http');
const PORT = 9967;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT, 'about:blank'
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
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2000);

    const r = await send('Runtime.evaluate', {
        expression: `(() => {
            const out = {};
            ['해', '매', '서', '싸'].forEach(char => {
                Engine.loadText(char);
                const e = Engine.jamoEntries.find(x => x.part === 'cho');
                const R = 150, s = R / 100;
                const off = document.createElement('canvas'); off.width = R; off.height = R;
                const ctx = off.getContext('2d');
                ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + Engine.styleParams.fontFamily;
                ctx.fillText(char, R / 2, R / 2);
                const d = ctx.getImageData(0, 0, R, R).data;
                const jb = computeDynamicJamoBounds(d, 0, 1, R, Engine.charsInfo[0], 'V', false);

                const minX = jb.minX, maxX = jb.maxX, minY = jb.minY, ySplit = jb.hasJong ? jb.choY2 : jb.maxY;
                const xSplit = jb.splitX;
                const isDoubleCho = ['ㅃ', 'ㅉ', 'ㄲ', 'ㄸ', 'ㅆ'].includes(char[0]);
                const isWideCho = ['ㅁ', 'ㅂ', 'ㅃ', 'ㅍ', 'ㅎ', 'ㅈ', 'ㅊ'].includes(char[0]);
                let choYTop = R, choYBot = 0, choXLeft = R, choXRight = 0;
                const choRightV = (isWideCho || isDoubleCho) ? (xSplit - 2) : Math.min(xSplit - 2, Math.round(minX + (maxX - minX) * 0.48));
                const choCoreRight = Math.max(minX + 4, xSplit - 6);
                for (let y = minY; y <= ySplit; y++) {
                    let rowCore = 0, rowAll = 0, rLeft = R, rRight = 0;
                    for (let x = minX; x <= choRightV; x++) {
                        if (d[(y * R + x) * 4 + 3] > 50) {
                            rowAll++;
                            if (x <= choCoreRight) rowCore++;
                            if (x < rLeft) rLeft = x;
                            if (x > rRight) rRight = x;
                        }
                    }
                    if (rowAll > 0) {
                        if (rowCore === 0 && choYTop === R && y < minY + Math.round(R * 0.18)) continue;
                        if (y < choYTop) choYTop = y;
                        if (y > choYBot) choYBot = y;
                        if (rLeft < choXLeft) choXLeft = rLeft;
                        if (rRight > choXRight) choXRight = rRight;
                    }
                }

                out[char] = {
                    oldChoY1: jb.choY1,
                    newChoY1: choYTop,
                    newChoY2: choYBot,
                    minY: jb.minY,
                    splitX: jb.splitX
                };
            });
            return JSON.stringify(out, null, 2);
        })()`
    });
    console.log(r.result.result.value);
    chrome.kill();
    process.exit(0);
})();
