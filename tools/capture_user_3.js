const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const PORT = 9986;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_cap_' + PORT,
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

        for (const char of ['궁', '웨', '되']) {
            await send('Runtime.evaluate', {
                expression: `Engine.loadText('${char}')`
            });
            await sleep(400);

            // Get canvas clip box if possible
            const clip = await send('Runtime.evaluate', {
                expression: `(() => {
                    const canvas = document.querySelector('canvas') || document.querySelector('#charCanvas') || document.querySelector('.han-canvas');
                    if (!canvas) return null;
                    const r = canvas.getBoundingClientRect();
                    return { x: r.x, y: r.y, width: r.width, height: r.height, scale: 1 };
                })()`,
                returnByValue: true
            });

            const shotParams = { format: 'png' };
            if (clip.result && clip.result.value) {
                shotParams.clip = clip.result.value;
            }

            const shot = await send('Page.captureScreenshot', shotParams);
            const path = 'C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/cur_' + encodeURIComponent(char) + '.png';
            fs.writeFileSync(path, Buffer.from(shot.data, 'base64'));
            console.log('Saved screenshot for', char, 'to', path);

            // Also inspect strokes coordinates
            const strokeInfo = await send('Runtime.evaluate', {
                expression: `(() => {
                    return Engine.strokes.map((pts, i) => ({
                        idx: i + 1,
                        meta: Engine.strokeMeta[i],
                        badge: (Engine.badgePositions && Engine.badgePositions[i]) || pts[0],
                        first: pts[0],
                        last: pts[pts.length - 1]
                    }));
                })()`,
                returnByValue: true
            });
            console.log(char, 'stroke details:', JSON.stringify(strokeInfo.result.value, null, 2));
        }
        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
