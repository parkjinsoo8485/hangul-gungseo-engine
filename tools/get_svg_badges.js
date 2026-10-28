const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9980;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,950',
    '--user-data-dir=' + process.env.TEMP + '/cdp_shot_we2_' + PORT, 'about:blank'
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
    await sleep(2500);

    const data = await send('Runtime.evaluate', {
        expression: `(() => {
            Engine.loadText('웨');
            Engine.stopDemo();
            const gBadges = document.getElementById('badges-group');
            const gLines = document.getElementById('guides-group');
            const badges = Array.from(gBadges ? gBadges.querySelectorAll('text') : []).map(t => ({
                num: t.textContent,
                x: parseFloat(t.getAttribute('x')),
                y: parseFloat(t.getAttribute('y'))
            }));
            const lines = Array.from(gLines ? gLines.querySelectorAll('path, line') : []).map(p => ({
                d: p.getAttribute('d')
            }));
            return {
                badges,
                lines,
                strokes: Engine.strokes.map((s, idx) => ({
                    idx: idx + 1,
                    first: [Math.round(s[0][0]*10)/10, Math.round(s[0][1]*10)/10],
                    last: [Math.round(s[s.length-1][0]*10)/10, Math.round(s[s.length-1][1]*10)/10]
                }))
            };
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(data.result.value, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
