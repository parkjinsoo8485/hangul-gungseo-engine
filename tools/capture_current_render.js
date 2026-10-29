const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const PORT = 9988;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_render_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    try {
        let list;
        for (let i = 0; i < 40; i++) {
            try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) { }
            await sleep(250);
        }
        const wsUrl = list.find(t => t.type === 'page').webSocketDebuggerUrl;
        const ws = new WebSocket(wsUrl);
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
        
        for (let i = 0; i < 40; i++) {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
            await sleep(250);
        }

        // Set character and render
        for (const char of ['궁', '웨']) {
            await send('Runtime.evaluate', {
                expression: `
                (() => {
                    const inp = document.getElementById('char-input');
                    inp.value = '${char}';
                    Engine.loadText('${char}');
                })()
                `
            });
            await sleep(1000);

            const ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 800, height: 600, scale: 1 } });
            const destDir = 'C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e';
            const filename = destDir + '/current_render_' + (char === '궁' ? 'gung' : 'we') + '.png';
            fs.writeFileSync(filename, Buffer.from(ss.data, 'base64'));
            console.log('Saved screenshot:', filename);
        }
        
        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
