const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9981;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,950',
    '--user-data-dir=' + process.env.TEMP + '/cdp_shot_we_fixed_' + PORT, 'about:blank'
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

    const artifactDir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d';

    const boardBox = await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '웨';
            Engine.loadText('웨');
            Engine.stopDemo();
            const svg = document.getElementById('calligraphy-svg');
            const r = svg.getBoundingClientRect();
            return { x: r.left, y: r.top, width: r.width, height: r.height };
        })()`,
        returnByValue: true
    });
    const clip = boardBox.result.value;

    const snap = await send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } });
    fs.writeFileSync(`${artifactDir}/we_fixed_browser.png`, Buffer.from(snap.data, 'base64'));
    console.log('Saved we_fixed_browser.png');

    ws.close(); chrome.kill(); process.exit(0);
})();
