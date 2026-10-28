const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_unpainted_sid_' + PORT, 'about:blank'
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

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '획순';
            Engine.loadText('획순');
            const g = Engine.glyphData;
            
            // In crop_box = (50, 30, 200, 180), unpainted pixels are around:
            // x: [50+50, 50+84] = [100, 134]
            // y: [30+48, 30+117] = [78, 147]
            // Let's check which pixels in stroke 0, 1, 2 have which sid and pid
            const countsBySid = { 0: 0, 1: 0, 2: 0, 3: 0 };
            const pidsBySid = { 0: [], 1: [], 2: [], 3: [] };

            for (let i = 0; i < g.idx.length; i++) {
                const sid = g.sid[i];
                if (countsBySid[sid] !== undefined) {
                    countsBySid[sid]++;
                    pidsBySid[sid].push(g.pid[i]);
                }
            }

            return {
                countsBySid,
                stroke0_pts: Engine.strokes[0].length,
                stroke1_pts: Engine.strokes[1].length,
                stroke2_pts: Engine.strokes[2].length,
                stroke3_pts: Engine.strokes[3].length,
                maxPid_0: Math.max(...pidsBySid[0]),
                maxPid_1: Math.max(...pidsBySid[1]),
                maxPid_2: Math.max(...pidsBySid[2]),
                maxPid_3: Math.max(...pidsBySid[3]),
            };
        })()`,
        returnByValue: true
    });

    console.log(JSON.stringify(res.result.value, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
