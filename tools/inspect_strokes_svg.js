const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_inspect_' + PORT, 'about:blank'
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

    const data = await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '획순';
            Engine.loadText('획순');
            
            // Let's get stroke 10 (which is 11th stroke, 0-indexed 10)
            const s10 = Engine.strokes[10];
            const allStrokes = Engine.strokes.map((pts, idx) => ({
                idx: idx + 1,
                pointsCount: pts.length,
                p0: pts[0],
                pMid: pts[Math.floor(pts.length / 2)],
                pEnd: pts[pts.length - 1]
            }));

            // Also check badges in SVG
            const badges = Array.from(document.querySelectorAll('.order-badge')).map(el => ({
                text: el.textContent,
                cx: el.getAttribute('cx') || el.querySelector('circle')?.getAttribute('cx'),
                cy: el.getAttribute('cy') || el.querySelector('circle')?.getAttribute('cy')
            }));

            // Also check centerline paths in SVG
            const guides = Array.from(document.querySelectorAll('.guide-line, .center-line, path[stroke]')).map(el => ({
                d: el.getAttribute('d'),
                stroke: el.getAttribute('stroke'),
                cls: el.getAttribute('class')
            }));

            return { allStrokes, badges, guides: guides.slice(0, 20) };
        })()`,
        returnByValue: true
    });

    console.log("Evaluate result:", JSON.stringify(data, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
