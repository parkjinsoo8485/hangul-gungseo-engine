const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9946;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--window-size=1600,1000',
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT,
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
    await new Promise(r => ws.onopen = r);
    let id = 0; const pend = {};
    ws.onmessage = m => {
        const j = JSON.parse(m.data);
        if (j.id && pend[j.id]) { pend[j.id](j); delete pend[j.id]; }
    };
    const send = (method, params = {}) => new Promise(r => {
        const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params }));
    });
    const ev = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    };
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    await ev(`(() => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;
        Engine.loadText('국어');
    })()`);
    await sleep(500);

    const rect = await ev(`(() => {
        const el = document.getElementById('canvas-box');
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
    })()`);

    // Let's test stroke 5 (horizontal tick of ㅓ) and stroke 6 (vertical stem of ㅓ)
    // Stroke 5 mid-draw:
    await ev(`(() => {
        Engine.currentStroke = 5;
        Engine.currentStep = Math.floor(Engine.strokes[5].length / 2);
        Engine.highlightCurrentStartDot();
        Engine.renderGlyphInk();
    })()`);
    await sleep(100);
    let shot = await send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 }
    });
    fs.writeFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/live_eo_s5_mid.png', Buffer.from(shot.result.data, 'base64'));

    // Stroke 5 complete:
    await ev(`(() => {
        Engine.currentStroke = 5;
        Engine.currentStep = Engine.strokes[5].length;
        Engine.highlightCurrentStartDot();
        Engine.renderGlyphInk();
    })()`);
    await sleep(100);
    shot = await send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 }
    });
    fs.writeFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/live_eo_s5_end.png', Buffer.from(shot.result.data, 'base64'));

    // Stroke 6 mid-draw:
    await ev(`(() => {
        Engine.currentStroke = 6;
        Engine.currentStep = Math.floor(Engine.strokes[6].length / 2);
        Engine.highlightCurrentStartDot();
        Engine.renderGlyphInk();
    })()`);
    await sleep(100);
    shot = await send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 }
    });
    fs.writeFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/live_eo_s6_mid.png', Buffer.from(shot.result.data, 'base64'));

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
