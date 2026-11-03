const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9952;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_shot_' + PORT,
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
    
    // Set viewport
    await send('Emulation.setDeviceMetricsOverride', {
        width: 1000,
        height: 600,
        deviceScaleFactor: 1,
        mobile: false
    });

    const fileUrl = 'file:///C:/한글획순/v2_pipeline/test_true_medial.html';
    await send('Page.navigate', { url: fileUrl });
    await sleep(1000);

    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/한글획순/v2_pipeline/medial_verification_result.png', Buffer.from(screenshot.data, 'base64'));
    console.log('Saved screenshot: C:/한글획순/v2_pipeline/medial_verification_result.png');
    
    ws.close();
    chrome.kill();
    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    chrome.kill();
    process.exit(1);
});
