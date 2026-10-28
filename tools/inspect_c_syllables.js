const { spawn } = require('child_process'), http = require('http');
const PORT = 9965;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_c_' + PORT, 'about:blank'
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
        returnByValue: true,
        expression: `(() => {
            const testChars = ['회', '의', '화', '홰', '권', '뀍', '띄', '픠', '환', '획'];
            const out = {};
            const R = 150, s = R / 100;
            const cv = document.createElement('canvas'); cv.width = R; cv.height = R;
            const ctx = cv.getContext('2d');
            const ff = Engine.styleParams.fontFamily;
            testChars.forEach(ch => {
                ctx.clearRect(0, 0, R, R);
                ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
                ctx.fillText(ch, R / 2, R / 2);
                const d = ctx.getImageData(0, 0, R, R).data;
                const info = decomposeHangul(ch);
                const vType = VOWEL_TYPE[info.jung] || 'V';
                const jb = computeDynamicJamoBounds(d, 0, 1, R, info, vType, !!info.jong);
                // Find left ink profile (x < jb.splitX) in 100-unit coords
                const leftRows = [];
                for (let y = jb.minY; y <= jb.maxY; y += 2) {
                    let cnt = 0, minLx = 999, maxLx = 0;
                    for (let x = jb.minX; x <= jb.splitX - 3; x++) {
                        if (d[(y * R + x) * 4 + 3] > 80) {
                            cnt++;
                            if (x < minLx) minLx = x;
                            if (x > maxLx) maxLx = x;
                        }
                    }
                    leftRows.push({ y: +(y/s).toFixed(1), cnt, xRange: cnt ? [+(minLx/s).toFixed(1), +(maxLx/s).toFixed(1)] : null });
                }
                Engine.loadText(ch); Engine.stopDemo();
                const strokes = Engine.strokes.map((st, idx) => {
                    const xs = st.map(p => p[0]), ys = st.map(p => p[1]);
                    return {
                        s: idx + 1,
                        part: Engine.strokeMeta[idx].part,
                        subPart: Engine.strokeMeta[idx].subPart,
                        x: [+(Math.min(...xs)).toFixed(1), +(Math.max(...xs)).toFixed(1)],
                        y: [+(Math.min(...ys)).toFixed(1), +(Math.max(...ys)).toFixed(1)]
                    };
                });
                out[ch] = {
                    jb: {
                        minY: +(jb.minY/s).toFixed(1), maxY: +(jb.maxY/s).toFixed(1),
                        choY1: +(jb.choY1/s).toFixed(1), choY2: +(jb.choY2/s).toFixed(1),
                        jungY1: +(jb.jungY1/s).toFixed(1), jungY2: +(jb.jungY2/s).toFixed(1),
                        jongY1: +(jb.jongY1/s).toFixed(1), splitX: +(jb.splitX/s).toFixed(1)
                    },
                    strokes,
                    leftRows: leftRows.filter(r => r.cnt > 0)
                };
            });
            return out;
        })()`
    });
    console.log(JSON.stringify(res.result.value, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
