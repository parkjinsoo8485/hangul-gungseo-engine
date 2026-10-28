const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_pid_check_' + PORT, 'about:blank'
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
            
            // Check stroke 2 (circle) pid values
            const pids2 = [];
            for (let i = 0; i < g.idx.length; i++) {
                if (g.sid[i] === 2) pids2.push(g.pid[i]);
            }
            pids2.sort((a,b)=>a-b);

            // Check stroke 0 (dot) pid values
            const pids0 = [];
            for (let i = 0; i < g.idx.length; i++) {
                if (g.sid[i] === 0) pids0.push(g.pid[i]);
            }
            pids0.sort((a,b)=>a-b);

            // Also check speedDist and how many steps playDemo actually takes for stroke 2
            const pts2 = Engine.strokes[2];
            const cum2 = [];
            let c = 0;
            for (let i = 0; i < pts2.length; i++) {
                if (i > 0) c += Math.hypot(pts2[i][0] - pts2[i-1][0], pts2[i][1] - pts2[i-1][1]);
                cum2.push(c);
            }

            // Simulate playDemo for stroke 2
            const speedDist = 1.15;
            let d = 0;
            const demoSteps = [];
            while (d < c) {
                d += speedDist;
                let pi = 0;
                while (pi < pts2.length - 1 && cum2[pi] < d) pi++;
                demoSteps.push(pi);
            }

            return {
                stroke2_ptsLength: pts2.length,
                stroke2_totalDist: c,
                demoStepsTaken: demoSteps.length,
                demoStepsSequence: demoSteps,
                stroke2_minPid: pids2[0],
                stroke2_maxPid: pids2[pids2.length - 1],
                stroke2_pidHistogram: {
                    pid0: pids2.filter(p => p === 0).length,
                    pidUnder20: pids2.filter(p => p < 20).length,
                    pidOver180: pids2.filter(p => p >= 180).length
                }
            };
        })()`,
        returnByValue: true
    });

    console.log(JSON.stringify(res.result.value, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
