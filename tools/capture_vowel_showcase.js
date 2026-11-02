const { spawn } = require('child_process'), http = require('http'), fs = require('fs'), path = require('path');
const PORT = 9986;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) { }
        await sleep(250);
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
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 50; i++) {
        try {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
        } catch (e) { }
        await sleep(200);
    }

    const outDir = 'C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e';
    const chars = ['예', '에', '여', '야', '약', '왜', '왝', '웨', '과', '닮', '가'];
    const names = { '예': 'ye', '에': 'e', '여': 'yeo', '야': 'ya', '약': 'yak', '왜': 'wae', '왝': 'waek', '웨': 'we', '과': 'gwa', '닮': 'dalm', '가': 'ga' };
    for (const ch of chars) {
        await send('Runtime.evaluate', { expression: `Engine.loadText('${ch}')` });
        await sleep(150);
        const clip = await send('Runtime.evaluate', {
            expression: `(() => {
                const canvas = document.querySelector('canvas');
                const r = canvas.getBoundingClientRect();
                return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
            })()`,
            returnByValue: true
        });
        const shot = await send('Page.captureScreenshot', { format: 'png', clip: clip.result.value });
        fs.writeFileSync(path.join(outDir, `fixed_${names[ch]}.png`), Buffer.from(shot.data, 'base64'));
        console.log('Saved fixed_' + names[ch] + '.png');
    }
    ws.close();
    chrome.kill();
    process.exit(0);
}
main();
