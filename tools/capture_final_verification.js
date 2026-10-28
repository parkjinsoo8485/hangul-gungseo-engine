const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9996;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_final_rec_' + PORT, 'about:blank'
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
    await sleep(2000);

    const artifactDir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d';

    // 1. Capture '회의' full view with red centerlines
    await send('Runtime.evaluate', {
        expression: `(() => {
            const el = document.getElementById('txt-input');
            if (el) { el.value = '회의'; el.dispatchEvent(new Event('input')); }
            Engine.loadText('회의');
            Engine.stopDemo();
            Engine.currentStroke = Engine.strokes.length;
            Engine.render();
            Engine.renderGlyphInk();
        })()`
    });
    await sleep(600);
    const snap1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(artifactDir + '/final_hoe_ui_verified.png', Buffer.from(snap1.data, 'base64'));
    console.log('Saved final_hoe_ui_verified.png');

    // 2. Capture step 6: '회' completed (stroke 0~5), '의' not yet started (stroke 6~8)
    await send('Runtime.evaluate', {
        expression: `(() => {
            Engine.loadText('회의');
            Engine.stopDemo();
            Engine.currentStroke = 6;
            Engine.currentStep = 0;
            Engine.renderGlyphInk();
            Engine.highlightCurrentStartDot();
        })()`
    });
    await sleep(600);
    const snap2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(artifactDir + '/final_hoe_ui_step6.png', Buffer.from(snap2.data, 'base64'));
    console.log('Saved final_hoe_ui_step6.png');

    ws.close();
    chrome.kill();
    process.exit(0);
})();
