const http = require('http'), { spawn } = require('child_process'), fs = require('fs');
const PORT = 9999;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT, 'about:blank'
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
    ws.onmessage = m => { const j = JSON.parse(m.data); if (j.id && pend[j.id]) { pend[j.id](j); delete pend[j.id]; } };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    };
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    // Test text: '대한민국'
    await ev(`(() => {
        const input = document.getElementById('text-input');
        if (input) input.value = '대한민국';
        Engine.loadText('대한민국');
    })()`);

    // Take screenshot of 대한민국 static glyph
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/final_demo_대한민국.png', Buffer.from(shot1.result.data, 'base64'));

    // Test text: '훈민정음'
    await ev(`(() => {
        const input = document.getElementById('text-input');
        if (input) input.value = '훈민정음';
        Engine.loadText('훈민정음');
    })()`);
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/final_demo_훈민정음.png', Buffer.from(shot2.result.data, 'base64'));

    // Test text: '궁서체' and play demo animation
    await ev(`(() => {
        const input = document.getElementById('text-input');
        if (input) input.value = '궁서체';
        Engine.loadText('궁서체');
    })()`);

    // Click '획순 시범쓰기'
    await ev(`(() => {
        const btn = document.getElementById('btn-demo');
        if (btn) btn.click();
    })()`);

    // Capture sequential frames of demo writing
    for (let f = 0; f < 5; f++) {
        await sleep(600);
        const shotDemo = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(`C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/final_demo_gungseo_frame_${f}.png`, Buffer.from(shotDemo.result.data, 'base64'));
    }

    console.log('Final demo playback and frames captured successfully.');
    chrome.kill();
    process.exit(0);
})();
