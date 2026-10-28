const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_video_' + PORT, 'about:blank'
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
    const videoFramesDir = artifactDir + '/video_frames';
    if (!fs.existsSync(videoFramesDir)) fs.mkdirSync(videoFramesDir, { recursive: true });

    const boardBox = await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '획순';
            Engine.loadText('획순');
            const svg = document.getElementById('calligraphy-svg');
            const r = svg.getBoundingClientRect();
            return { x: r.left, y: r.top, width: r.width, height: r.height };
        })()`,
        returnByValue: true
    });
    const clip = boardBox.result.value;

    // Start demo
    await send('Runtime.evaluate', { expression: `Engine.playDemo()` });

    // Capture frames at high density
    let frameIdx = 0;
    const startTime = Date.now();
    const frameMeta = [];

    while (Date.now() - startTime < 12000) { // capture up to 12s
        const state = await send('Runtime.evaluate', {
            expression: `({
                sIdx: Engine.currentStroke,
                pIdx: Engine.currentStep,
                isDemo: !!Engine.demoTimer,
                strokesLen: Engine.strokes.length
            })`,
            returnByValue: true
        });

        const snap = await send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } });
        const padIdx = String(frameIdx).padStart(4, '0');
        const framePath = `${videoFramesDir}/frame_${padIdx}.png`;
        fs.writeFileSync(framePath, Buffer.from(snap.data, 'base64'));

        frameMeta.push({
            frame: frameIdx,
            time: Date.now() - startTime,
            sIdx: state.result.value.sIdx,
            pIdx: state.result.value.pIdx,
            isDemo: state.result.value.isDemo
        });

        frameIdx++;

        // If demo finished and paused, stop
        if (!state.result.value.isDemo && frameIdx > 15) {
            break;
        }

        await sleep(40); // ~25 fps
    }

    fs.writeFileSync(`${artifactDir}/video_meta.json`, JSON.stringify(frameMeta, null, 2));
    console.log(`Captured ${frameIdx} frames in ${Date.now() - startTime}ms`);

    ws.close(); chrome.kill(); process.exit(0);
})();
