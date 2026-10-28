const { spawn } = require('child_process'), http = require('http');
const PORT = 9970;
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
            const R = 384;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px Batang, serif';

            const testCh = (ch) => {
                ctx.clearRect(0, 0, R, R);
                ctx.fillText(ch, R / 2, R / 2);
                const d = ctx.getImageData(0, 0, R, R).data;

                let minY = R, maxY = 0, minX = R, maxX = 0;
                for (let y = 0; y < R; y++) {
                    for (let lx = 0; lx < R; lx++) {
                        const a = d[(y * R + lx) * 4 + 3];
                        if (a > 50) {
                            if (lx < minX) minX = lx;
                            if (lx > maxX) maxX = lx;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }
                const Hc = maxY - minY;
                const yTopHalf = Math.round(minY + Hc * 0.45);
                // Search for the right vertical stem (stemX) in [0.60, 1.00] of [minX, maxX]
                let maxStemCol = -1, stemX = Math.round(minX + (maxX - minX) * 0.75);
                const stemScanStart = Math.round(minX + (maxX - minX) * 0.58);
                const stemScanEnd = maxX;
                for (let x = stemScanStart; x <= stemScanEnd; x++) {
                    let sum = 0;
                    for (let y = minY; y <= yTopHalf; y++) {
                        if (d[(y * R + x) * 4 + 3] > 50) sum++;
                    }
                    if (sum > maxStemCol) { maxStemCol = sum; stemX = x; }
                }

                // Valley search strictly between [choRight, stemX]
                // Scan leftwards from stemX - gap to find the first zero-density or minimum valley
                let minXVal = 1e9, xSplit = stemX - Math.max(4, Math.round(R * 0.03));
                const xStart = Math.round(minX + (maxX - minX) * 0.45);
                const xEnd = stemX - Math.max(3, Math.round(R * 0.02));
                for (let x = xEnd; x >= xStart; x--) {
                    let colSum = 0;
                    for (let y = minY; y <= yTopHalf; y++) {
                        if (d[(y * R + x) * 4 + 3] > 50) colSum++;
                    }
                    if (colSum < minXVal) { minXVal = colSum; xSplit = x; }
                    if (colSum === 0) break; // Found complete whitespace gap!
                }

                // Now compute cho bounds in [minX, xSplit]
                let choX1 = R, choX2 = 0;
                for (let y = minY; y <= yTopHalf; y++) {
                    for (let x = minX; x <= xSplit; x++) {
                        if (d[(y * R + x) * 4 + 3] > 50) {
                            if (x < choX1) choX1 = x;
                            if (x > choX2) choX2 = x;
                        }
                    }
                }

                return {
                    ch,
                    minX: +(minX * 100 / R).toFixed(1),
                    maxX: +(maxX * 100 / R).toFixed(1),
                    stemX: +(stemX * 100 / R).toFixed(1),
                    xSplit: +(xSplit * 100 / R).toFixed(1),
                    choX1: +(choX1 * 100 / R).toFixed(1),
                    choX2: +(choX2 * 100 / R).toFixed(1),
                    choMidX: +(((choX1 + choX2) * 0.5) * 100 / R).toFixed(1)
                };
            };
            return JSON.stringify(['회', '의', '화', '와', '위', '권', '띈', '웬'].map(testCh));
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(JSON.parse(res.result.value), null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
