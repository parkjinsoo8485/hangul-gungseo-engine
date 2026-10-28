const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_final_' + PORT, 'about:blank'
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

    const artifactDir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d';

    await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '획순';
            Engine.loadText('획순');
            Engine.stopDemo();
            Engine.currentStroke = Engine.strokes.length;
            Engine.currentStep = 9999;
            Engine.renderGlyphInk();
            Engine.renderScene();
        })()`
    });
    await sleep(600);

    // Get bounding client rect of calligraphy board container
    const boardBox = await send('Runtime.evaluate', {
        expression: `(() => {
            const svg = document.getElementById('calligraphy-svg');
            const r = svg.getBoundingClientRect();
            return { x: r.left, y: r.top, width: r.width, height: r.height };
        })()`,
        returnByValue: true
    });

    const clip = boardBox.result.value;
    const snap = await send('Page.captureScreenshot', {
        format: 'png',
        clip: {
            x: clip.x,
            y: clip.y,
            width: clip.width,
            height: clip.height,
            scale: 1
        }
    });

    fs.writeFileSync(artifactDir + '/hoik_soon_perfect_board.png', Buffer.from(snap.data, 'base64'));
    console.log('Saved hoik_soon_perfect_board.png');

    // Also take full UI screenshot
    const fullSnap = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(artifactDir + '/hoik_soon_perfect_full_ui.png', Buffer.from(fullSnap.data, 'base64'));
    console.log('Saved hoik_soon_perfect_full_ui.png');

    ws.close(); chrome.kill(); process.exit(0);
})();
