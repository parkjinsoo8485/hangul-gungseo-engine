const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9958;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_eight_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    let list;
    for (let i = 0; i < 30; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) {}
        await sleep(200);
    }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => {
            const r = JSON.parse(data);
            if (r.id === reqId) { ws.removeEventListener('message', onMsg); if (r.error) rej(r.error); else res(r.result); }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Runtime.enable');

    const errors = [];
    ws.addEventListener('message', ({ data }) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
            errors.push(msg.params.args.map(a => a.value).join(' '));
        }
        if (msg.method === 'Runtime.exceptionThrown') {
            errors.push(msg.params.exceptionDetails.text);
        }
    });

    await send('Emulation.setDeviceMetricsOverride', {
        width: 1100,
        height: 850,
        deviceScaleFactor: 1,
        mobile: false
    });

    await send('Page.navigate', { url: 'file:///C:/한글획순/v2_pipeline/index.html' });
    await sleep(1000);

    const chars = ['마', '바', '사', '아'];
    for (const ch of chars) {
        console.log(`Running real browser test for [${ch}]...`);
        await send('Runtime.evaluate', { expression: `selectChar('${ch}')` });
        // Wait for complete sequential animation (750ms * strokes count + buffer)
        await sleep(3500);

        const shot = await send('Page.captureScreenshot', { format: 'png' });
        const filePath = `C:/한글획순/v2_pipeline/screenshot_${ch}.png`;
        fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
        console.log(`Saved screenshot: ${filePath}`);
    }

    console.log(`\n=== Verification Finished ===`);
    console.log(`Console Errors: ${errors.length}`);

    ws.close();
    chrome.kill();
    process.exit(errors.length === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Error:', err);
    chrome.kill();
    process.exit(1);
});
