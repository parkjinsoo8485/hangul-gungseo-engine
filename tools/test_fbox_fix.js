const http = require('http');
const PORT = 9972;
const { spawn } = require('child_process');
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

        const res = await send('Runtime.evaluate', {
            expression: `(() => {
                Engine.loadText('궥');
                const g = Engine.glyphData;
                const R = g.R, W = g.W;
                
                // Let's test with original fbox vs modified fbox
                const vEntry = Engine.jamoEntries.find(e => e.subPart === 'jung_v');
                const origFbox = [...vEntry.fbox];
                
                // If fbox[0] is set to 48.34, fbox[2] is 26.37
                vEntry.fbox[0] = 48.34;
                vEntry.fbox[2] = 26.37;
                Engine.rebuildStrokes();
                
                const pts = Engine.strokes[3]; // stroke 4 (tick)
                let airCount = 0;
                pts.forEach(p => {
                    const px = Math.round(p[0] * R / 100);
                    const py = Math.round(p[1] * R / 100);
                    const pIdx = py * W + px;
                    const idx = g.idx.indexOf(pIdx);
                    if (idx < 0 || g.a[idx] < 20) airCount++;
                });
                
                const s4 = Engine.strokes[3];
                const s5 = Engine.strokes[4];
                const s6 = Engine.strokes[5];
                
                return {
                    origFbox,
                    newFbox: vEntry.fbox,
                    stroke4_airCount: airCount,
                    stroke4_total: pts.length,
                    stroke4_first: s4[0],
                    stroke4_last: s4[s4.length - 1],
                    stroke5_stem1_first: s5[0],
                    stroke6_stem2_first: s6[0]
                };
            })()`,
            returnByValue: true
        });
        console.log('궥 test result:', JSON.stringify(res.result.value, null, 2));

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
