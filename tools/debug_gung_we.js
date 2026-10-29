const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const PORT = 9988;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_debug_' + PORT,
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

        for (const char of ['궁', '웨']) {
            const res = await send('Runtime.evaluate', {
                expression: `
                (() => {
                    Engine.loadText('${char}');
                    const strokes = Engine.strokes;
                    const meta = Engine.strokeMeta || [];
                    return {
                        char: '${char}',
                        strokesCount: strokes.length,
                        strokes: strokes.map((pts, idx) => ({
                            idx: idx + 1,
                            whId: (meta[idx] && meta[idx].whId) || null,
                            part: (meta[idx] && meta[idx].part) || null,
                            subPart: (meta[idx] && meta[idx].subPart) || null,
                            ptsCount: pts.length,
                            firstPt: pts[0],
                            midPt: pts[Math.floor(pts.length / 2)],
                            lastPt: pts[pts.length - 1],
                            allPtsSummary: pts.filter((_, i) => i % Math.max(1, Math.floor(pts.length / 5)) === 0)
                        }))
                    };
                })()
                `,
                returnByValue: true
            });
            console.log('Result for', char, ':', JSON.stringify(res.result.value, null, 2));
        }
        
        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
