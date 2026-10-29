const http = require('http');
const PORT = 9998;
const fs = require('fs');
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_fix_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { }
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 30; i++) {
        const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
        if (chk.result && chk.result.value) break;
        await sleep(300);
    }

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    // Test new choY2 logic on '되'
    const res = await evalJs(`(() => {
        Engine.loadText('되');
        const g = Engine.glyphData;
        const R = g.R, W = g.W;
        let minX = W, maxX = 0, minY = R, maxY = 0;
        for (let i = 0; i < g.idx.length; i++) {
            const p = g.idx[i];
            const x = p % W, y = Math.floor(p / W);
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
        const Hc = maxY - minY;
        const xSplit = Math.round(minX + (maxX - minX) * 0.55);

        // find yBarC
        const barSearchMin = Math.round(minY + Hc * 0.54);
        const barSearchMax = Math.round(minY + Hc * 0.76);
        let yBarC = Math.round((barSearchMin + barSearchMax) * 0.5), maxLeftBar = -1;
        for (let y = barSearchMin; y <= barSearchMax; y++) {
            let leftSum = 0;
            for (let x = minX; x <= xSplit - 2; x++) {
                if (g.idx.indexOf(y * W + x) >= 0) leftSum++;
            }
            if (leftSum > maxLeftBar) { maxLeftBar = leftSum; yBarC = y; }
        }

        // Search choY2 backwards from yBarC
        // Above yBarC, there is the vertical stem of ㅗ (width ~10-25px)
        // Above the stem of ㅗ, there is either a gap or the bottom stroke of cho (width > 40px)
        // Find the bottom-most boundary of cho: scan upwards from yBarC - 4
        let foundValley = yBarC - 10;
        let minW = 1e9;
        for (let y = yBarC - Math.round(Hc * 0.04); y >= Math.round(minY + Hc * 0.45); y--) {
            let rowLeft = 0;
            for (let x = minX; x <= xSplit - 2; x++) {
                if (g.idx.indexOf(y * W + x) >= 0) rowLeft++;
            }
            if (rowLeft < minW) {
                minW = rowLeft;
                foundValley = y;
            }
        }

        return {
            yBarC,
            yBarC_100: yBarC * 100 / R,
            foundValley,
            foundValley_100: foundValley * 100 / R,
            minW
        };
    })()`);
    console.log(JSON.stringify(res, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
}
run();
