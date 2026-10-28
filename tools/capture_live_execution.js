const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9974;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--window-size=1280,950',
    '--user-data-dir=' + process.env.TEMP + '/cdp_live_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { }
        await sleep(250);
    }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => {
            const r = JSON.parse(data);
            if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r.result); }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const artifactDir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d';
    const snap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${artifactDir}/live_browser_execution_hoik_soon.png`, Buffer.from(snap.data, 'base64'));
    console.log('Saved live_browser_execution_hoik_soon.png');

    ws.close();
    chrome.kill();
    process.exit(0);
})();
