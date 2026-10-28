const { spawn } = require('child_process'), http = require('http');
const PORT = 9971;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT, 'about:blank'
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
    await sleep(1500);

    const steps = [];
    for (let s = 1; s <= 9; s++) {
        const res = await send('Runtime.evaluate', {
            expression: `(() => {
                Engine.loadText('회의');
                Engine.stopDemo();
                Engine.currentStroke = ${s};
                Engine.renderScene();
                // Check visible strokes in SVG
                const guideLayer = document.getElementById('guide-layer');
                const strokeLayer = document.getElementById('stroke-layer');
                const clipDefs = document.getElementById('clip-defs');
                return {
                    currentStroke: Engine.currentStroke,
                    totalStrokes: Engine.strokes.length,
                    strokeBadges: Engine.badgePositions.length
                };
            })()`,
            returnByValue: true
        });
        steps.push(res.result.value);
    }
    console.log(JSON.stringify(steps, null, 2));

    // Also take a screenshot at stroke = 3 (after ㅎ is drawn) and stroke = 6 (after 회 is drawn)
    await send('Runtime.evaluate', { expression: `Engine.currentStroke = 6; Engine.renderScene();` });
    await sleep(300);
    const shot6 = await send('Page.captureScreenshot', { format: 'png' });
    require('fs').writeFileSync('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/hoe_step6.png', Buffer.from(shot6.data, 'base64'));
    console.log('Saved hoe_step6.png');

    ws.close(); chrome.kill(); process.exit(0);
})();
