const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

const PORT = 9954;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_deep_' + PORT,
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

    await send('Emulation.setDeviceMetricsOverride', {
        width: 1200,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });

    await send('Page.navigate', { url: 'file:///C:/한글획순/v2_pipeline/index.html' });
    await sleep(800);

    // Deep step-by-step frame inspection for '다' and '라'
    // Let's inspect '다'
    console.log('--- Deep Step Inspection for 다 ---');
    await send('Runtime.evaluate', { expression: `selectChar('다')` });
    await sleep(300);

    // Hide all animated strokes
    await send('Runtime.evaluate', { expression: `
        [0, 1, 2, 3].forEach(idx => {
            const b = document.getElementById('anim-brush-' + idx);
            if (b) { b.style.transition = 'none'; b.style.strokeDashoffset = b.getTotalLength(); }
        });
    `});

    // Step 0: Draw Stroke 0 (상단 가로) only!
    await send('Runtime.evaluate', { expression: `
        const b = document.getElementById('anim-brush-0');
        b.style.strokeDashoffset = '0';
    `});
    await sleep(200);
    let shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/한글획순/v2_pipeline/step_da_stroke0.png', Buffer.from(shot.data, 'base64'));
    console.log('Captured step_da_stroke0.png');

    // Step 1: Draw Stroke 1 (ㄴ형태) only!
    await send('Runtime.evaluate', { expression: `
        const b = document.getElementById('anim-brush-1');
        b.style.strokeDashoffset = '0';
    `});
    await sleep(200);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/한글획순/v2_pipeline/step_da_stroke1.png', Buffer.from(shot.data, 'base64'));
    console.log('Captured step_da_stroke1.png');

    // Step 2: Draw Stroke 2 (모음 기둥)
    await send('Runtime.evaluate', { expression: `
        const b = document.getElementById('anim-brush-2');
        b.style.strokeDashoffset = '0';
    `});
    await sleep(200);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/한글획순/v2_pipeline/step_da_stroke2.png', Buffer.from(shot.data, 'base64'));
    console.log('Captured step_da_stroke2.png');

    // Step 3: Draw Stroke 3 (모음 곁줄기)
    await send('Runtime.evaluate', { expression: `
        const b = document.getElementById('anim-brush-3');
        b.style.strokeDashoffset = '0';
    `});
    await sleep(200);
    shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('C:/한글획순/v2_pipeline/step_da_stroke3.png', Buffer.from(shot.data, 'base64'));
    console.log('Captured step_da_stroke3.png');

    // Analyze pixel bleed on '다' stroke 0:
    // Does stroke 0 bleed into stroke 1 (ㄴ형)?
    // In our SVG: clipPath is the WHOLE glyph outline!
    // If brush-0 has clipWidth 120 and goes M 150 560 L 485 555,
    // because the clipPath is the ENTIRE '다' outline, does brush-0 bleed downwards into the vertical stem of ㄴ?
    const evalBleed = await send('Runtime.evaluate', {
        expression: `
            (() => {
                const b0 = document.getElementById('anim-brush-0');
                const b1 = document.getElementById('anim-brush-1');
                // Check if b0 overlap with b1 region
                return {
                    b0_width: b0.getAttribute('stroke-width'),
                    b0_points: b0.getAttribute('points'),
                    b1_points: b1.getAttribute('points')
                };
            })()
        `,
        returnByValue: true
    });
    console.log('Bleed Analysis Info:', evalBleed.result.value);

    ws.close();
    chrome.kill();
    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    chrome.kill();
    process.exit(1);
});
