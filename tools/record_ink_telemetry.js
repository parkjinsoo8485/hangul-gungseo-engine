const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9993;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_tel_' + PORT, 'about:blank'
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
    await sleep(2500);

    const artifactDir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d';

    await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '획순';
            Engine.loadText('획순');
            Engine.playDemo();
        })()`
    });

    const telemetry = [];
    const startTime = Date.now();
    let prevShown = 0;

    while (Date.now() - startTime < 12000) {
        const state = await send('Runtime.evaluate', {
            expression: `(() => {
                const g = Engine.glyphData;
                const shown = Engine.glyphShown;
                const sIdx = Engine.currentStroke;
                const pIdx = Engine.currentStep;
                const isDemo = !!Engine.demoTimer;
                return { shown, sIdx, pIdx, isDemo, totalPixels: g.idx.length };
            })()`,
            returnByValue: true
        });

        const v = state.result.value;
        const diff = v.shown - prevShown;
        prevShown = v.shown;

        telemetry.push({
            time: Date.now() - startTime,
            sIdx: v.sIdx,
            pIdx: v.pIdx,
            shown: v.shown,
            diff,
            isDemo: v.isDemo,
            totalPixels: v.totalPixels
        });

        if (!v.isDemo && telemetry.length > 20) break;
        await sleep(35);
    }

    fs.writeFileSync(`${artifactDir}/ink_telemetry.json`, JSON.stringify(telemetry, null, 2));
    console.log(`Captured ${telemetry.length} telemetry frames`);

    ws.close(); chrome.kill(); process.exit(0);
})();
