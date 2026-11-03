const { spawn } = require('child_process');
const http = require('http');

const PORT = 9957;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_verify_' + PORT,
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
    await send('Page.navigate', { url: 'file:///C:/한글획순/v2_pipeline/index.html' });
    await sleep(1500);

    const evalRes = await send('Runtime.evaluate', {
        expression: `
            (() => {
                selectChar('다');
                const b0 = document.getElementById('anim-brush-0');
                const wrap = b0.parentElement;
                const clipUrl = wrap.getAttribute('clip-path');
                const clipId = clipUrl.replace('url(\"#', '').replace('url(#', '').replace('\")', '').replace(')', '');
                const clipElem = document.getElementById(clipId);
                const rect = clipElem.querySelector('rect');
                const rectY = Number(rect.getAttribute('y'));
                const stemTopY = 480;
                return {
                    char: '다',
                    stroke0_clipId: clipId,
                    clipRectY: rectY,
                    stemTopY: stemTopY,
                    bleedPrevented: rectY > stemTopY
                };
            })()
        `,
        returnByValue: true
    });

    console.log('DOM Evaluation Result:', evalRes.result.value);

    ws.close();
    chrome.kill();
    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    chrome.kill();
    process.exit(1);
});
