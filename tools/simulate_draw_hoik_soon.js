const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_draw_' + PORT, 'about:blank'
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

    // 1. Load '획순' and check strokes
    const info = await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '획순';
            Engine.loadText('획순');
            Engine.stopDemo();
            return {
                strokeCount: Engine.strokes.length,
                strokes: Engine.strokes.map((st, i) => ({
                    idx: i + 1,
                    len: st.length,
                    start: [+st[0][0].toFixed(1), +st[0][1].toFixed(1)],
                    mid: [+st[Math.floor(st.length/2)][0].toFixed(1), +st[Math.floor(st.length/2)][1].toFixed(1)],
                    end: [+st[st.length-1][0].toFixed(1), +st[st.length-1][1].toFixed(1)],
                    segType: st[0][4]
                }))
            };
        })()`,
        returnByValue: true
    });

    console.log('Strokes info:', JSON.stringify(info.result.value, null, 2));

    // 2. Capture board bounding box
    const boardBox = await send('Runtime.evaluate', {
        expression: `(() => {
            const svg = document.getElementById('calligraphy-svg');
            const r = svg.getBoundingClientRect();
            return { x: r.left, y: r.top, width: r.width, height: r.height };
        })()`,
        returnByValue: true
    });
    const clip = boardBox.result.value;

    // 3. Step-by-step draw animation screenshots
    const strokeCount = info.result.value.strokeCount;
    for (let s = 1; s <= strokeCount; s++) {
        await send('Runtime.evaluate', {
            expression: `(() => {
                Engine.currentStroke = ${s};
                Engine.currentStep = 9999;
                Engine.renderGlyphInk();
                Engine.renderScene();
            })()`
        });
        await sleep(100);
        const snap = await send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } });
        fs.writeFileSync(`${artifactDir}/draw_step_${s}.png`, Buffer.from(snap.data, 'base64'));
    }
    console.log(`Saved draw_step_1.png to draw_step_${strokeCount}.png`);

    // 4. Capture complete drawing
    await send('Runtime.evaluate', {
        expression: `(() => {
            Engine.currentStroke = ${strokeCount};
            Engine.currentStep = 9999;
            Engine.renderGlyphInk();
            Engine.renderScene();
        })()`
    });
    await sleep(200);
    const finalBoard = await send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } });
    fs.writeFileSync(`${artifactDir}/hoik_soon_drawn_complete.png`, Buffer.from(finalBoard.data, 'base64'));
    console.log('Saved hoik_soon_drawn_complete.png');

    ws.close(); chrome.kill(); process.exit(0);
})();
