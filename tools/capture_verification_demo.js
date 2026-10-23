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

    const testWords = ['국어', '한글'];
    const outDir = 'C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e';

    for (const w of testWords) {
        await ev(`(() => {
            const chk = document.getElementById('chk-glyph');
            if (chk) chk.checked = true;
            Engine.loadText('${w}');
        })()`);
        await sleep(500);

        const strokeCount = await ev(`Engine.strokes.length`);
        console.log(`Word: ${w}, Total Strokes: ${strokeCount}`);

        const rect = await ev(`(() => {
            const el = document.getElementById('canvas-box');
            const r = el.getBoundingClientRect();
            return { x: r.left, y: r.top, width: r.width, height: r.height };
        })()`);

        // Capture step by step stroke reveals
        for (let s = 0; s < strokeCount; s++) {
            await ev(`(() => {
                Engine.currentStroke = ${s};
                Engine.currentStep = 999999;
                Engine.renderGlyphInk();
            })()`);
            await sleep(60);

            const shot = await send('Page.captureScreenshot', {
                format: 'png',
                clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 }
            });
            const fname = `final_step_${w}_s${s}.png`;
            fs.writeFileSync(`${outDir}/${fname}`, Buffer.from(shot.result.data, 'base64'));
            console.log(`Saved step: ${fname}`);
        }
    }

    ws.close();
    chrome.kill();
    console.log('Finished capturing all verification frames.');
    process.exit(0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
