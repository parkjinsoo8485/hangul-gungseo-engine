const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9982;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,950',
    '--user-data-dir=' + process.env.TEMP + '/cdp_shot_test_' + PORT, 'about:blank'
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const r = await send('Runtime.evaluate', {
        expression: `(() => {
            Engine.loadText('웨');
            Engine.stopDemo();
            const svg = document.getElementById('calligraphy-svg');
            const circles = Array.from(svg.querySelectorAll('circle')).map(c => ({
                cx: parseFloat(c.getAttribute('cx')),
                cy: parseFloat(c.getAttribute('cy')),
                r: c.getAttribute('r'),
                fill: c.getAttribute('fill')
            }));
            const polylines = Array.from(svg.querySelectorAll('polyline, path.guide-spine, line')).map(p => ({
                tag: p.tagName,
                cls: p.getAttribute('class'),
                pts: p.getAttribute('points') || p.getAttribute('d')
            }));
            return { circles, polylines: polylines.slice(0, 10) };
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(r.result.value, null, 2));
    ws.close(); chrome.kill(); process.exit(0);
})();
