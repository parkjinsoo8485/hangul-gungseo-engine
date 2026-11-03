const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9953;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_pipeline_' + PORT,
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

    // Collect console errors
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

    const fileUrl = 'file:///C:/한글획순/v2_pipeline/index.html';
    await send('Page.navigate', { url: fileUrl });
    await sleep(800);

    // Test '가', '나', '다', '라' tabs and take screenshots
    const chars = ['가', '나', '다', '라'];
    for (const ch of chars) {
        console.log(`Testing character [${ch}]...`);
        await send('Runtime.evaluate', { expression: `selectChar('${ch}')` });
        // wait for animation to complete
        await sleep(2500);

        const shot = await send('Page.captureScreenshot', { format: 'png' });
        const filePath = `C:/한글획순/v2_pipeline/screenshot_${ch}.png`;
        fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
        console.log(`Saved screenshot: ${filePath}`);
    }

    console.log(`\n=== Verification Complete ===`);
    console.log(`Console Errors: ${errors.length}`);
    if (errors.length > 0) {
        console.error('Errors found:', errors);
    }

    ws.close();
    chrome.kill();
    process.exit(errors.length === 0 ? 0 : 1);
}

main().catch(err => {
    console.error('Error:', err);
    chrome.kill();
    process.exit(1);
});
