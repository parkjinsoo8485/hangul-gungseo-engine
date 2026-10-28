const { spawn } = require('child_process'), http = require('http');
const PORT = 9996;
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
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r.result); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1500);

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const R = 150, s = R / 100;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d');
            const ff = Engine.styleParams.fontFamily;

            const testChar = (ch) => {
                Engine.loadText(ch);
                ctx.clearRect(0, 0, R, R);
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
                ctx.fillText(ch, R / 2, R / 2);
                const d = ctx.getImageData(0, 0, R, R).data;

                const jb = Engine.dynBounds ? Engine.dynBounds[0] : null;
                const eJungH = Engine.jamoEntries.find(e => e.subPart === 'jung_h');
                const choY2 = Math.round(jb.choY2 * 150 / 300);
                const yBarC = Math.round(jb.yBarC * 150 / 300);
                const minX = Math.round(jb.minX * 150 / 300);
                const splitX = Math.round(jb.splitX * 150 / 300);

                let maxCol = -1, stemX_O = -1;
                for (let x = minX; x <= splitX - 4; x++) {
                    let colSum = 0;
                    for (let y = choY2; y < yBarC - 1; y++) {
                        if (d[(y * R + x) * 4 + 3] > 50) colSum++;
                    }
                    if (colSum > maxCol) { maxCol = colSum; stemX_O = x; }
                }

                return {
                    ch,
                    choY2, yBarC, minX, splitX,
                    stemX_O, maxCol,
                    stemX_O_user: +(stemX_O / s).toFixed(1)
                };
            };

            return JSON.stringify([
                testChar('됙'),
                testChar('왹'),
                testChar('됨'),
                testChar('욀')
            ]);
        })()`,
        returnByValue: true
    });
    console.log(JSON.parse(res.result.value));
    ws.close(); chrome.kill(); process.exit(0);
})();
