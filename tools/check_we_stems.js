const http = require('http');
const PORT = 9973;
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
                Engine.loadText('웨');
                const st = Engine.strokes;
                const m = Engine.strokeMeta;
                let stemXList = [];
                st.forEach((stOther, sOther) => {
                    const mOther = m[sOther];
                    if (mOther && mOther.part === 'jung' && stOther.length >= 4) {
                        const stDy = stOther[stOther.length - 1][1] - stOther[0][1];
                        const stDx = stOther[stOther.length - 1][0] - stOther[0][0];
                        if (stDy > Math.abs(stDx) * 1.5 && stDy > 15) {
                            const avgX = stOther.reduce((acc, pt) => acc + pt[0], 0) / stOther.length;
                            stemXList.push({ sOther, whId: mOther.whId, subPart: mOther.subPart, avgX });
                        }
                    }
                });
                return {
                    stemXList,
                    stroke4: st[3]
                };
            })()`,
            returnByValue: true
        });
        console.log('웨 stemXList info:', JSON.stringify(res.result.value, null, 2));

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
