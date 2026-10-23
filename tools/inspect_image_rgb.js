const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9951;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
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
    await send('Page.enable');

    const imgData = fs.readFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/.user_uploaded/media_1792717917465_dc2e384b.png').toString('base64');
    await send('Page.navigate', { url: 'data:text/html,<html><body style=\"margin:0\"><img id=\"img\" src=\"data:image/png;base64,' + imgData + '\"/></body></html>' });
    await sleep(1000);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        return r.result.value;
    };

    const details = await evalJs(`
        (function() {
            const img = document.getElementById('img');
            const cv = document.createElement('canvas');
            cv.width = img.naturalWidth;
            cv.height = img.naturalHeight;
            const ctx = cv.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const idata = ctx.getImageData(0, 0, cv.width, cv.height).data;
            
            // Check RGB of pixel at x=100 (Badge 3 is around x=100, y=108)
            // Let's inspect column x=100 from y=110 to 180
            const col100 = [];
            for (let y = 110; y <= 180; y += 2) {
                const idx = (y * cv.width + 100) * 4;
                col100.push({ y, r: idata[idx], g: idata[idx+1], b: idata[idx+2] });
            }

            // Also inspect column of the black stem (x around 130..150)
            const col140 = [];
            for (let y = 110; y <= 180; y += 2) {
                const idx = (y * cv.width + 140) * 4;
                col140.push({ y, r: idata[idx], g: idata[idx+1], b: idata[idx+2] });
            }

            return { col100, col140 };
        })()
    `);

    console.log('Pixels under Badge 3 (col x=100):');
    details.col100.slice(0, 15).forEach(p => console.log(` y=${p.y}: rgb(${p.r}, ${p.g}, ${p.b})`));
    console.log('\nPixels inside black stem (col x=140):');
    details.col140.slice(0, 15).forEach(p => console.log(` y=${p.y}: rgb(${p.r}, ${p.g}, ${p.b})`));

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
