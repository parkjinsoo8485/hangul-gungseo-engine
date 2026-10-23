const http = require('http'), { spawn } = require('child_process');
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

    const test = await ev(`(() => {
        const speedSel = document.getElementById('select-demo-speed');
        Engine.loadText('한글');
        Engine.playDemo();
        return {
            speedSelExists: !!speedSel,
            speedVal: speedSel ? speedSel.value : null,
            timerRunning: !!Engine.demoTimer,
            demoSpeedMultiplier: Engine.demoSpeedMultiplier
        };
    })()`);
    console.log(JSON.stringify(test, null, 2));

    await sleep(800);
    const progress = await ev(`(() => {
        return {
            currentStroke: Engine.currentStroke,
            currentStep: Engine.currentStep,
            totalStrokes: Engine.strokes.length
        };
    })()`);
    console.log('Progress after 800ms:', JSON.stringify(progress, null, 2));

    chrome.kill();
    process.exit(0);
})();
