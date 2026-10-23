const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9945;
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

    // Click playDemo button
    await ev(`(() => {
        Engine.playDemo();
    })()`);

    const rect = await ev(`(() => {
        const el = document.getElementById('canvas-box');
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
    })()`);

    // Capture 15 frames during playback at 120ms intervals
    for (let f = 0; f < 15; f++) {
        await sleep(120);
        const state = await ev(`({
            sIdx: Engine.currentStroke,
            pIdx: Engine.currentStep,
            shown: Engine.glyphShown
        })`);
        const shot = await send('Page.captureScreenshot', {
            format: 'png',
            clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 }
        });
        const outPath = `C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/live_demo_${f}.png`;
        fs.writeFileSync(outPath, Buffer.from(shot.result.data, 'base64'));
        console.log(`Frame ${f}: stroke=${state.sIdx}, step=${state.pIdx}, shown=${state.shown}`);
    }

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
