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

    // Create an html page displaying the uploaded image
    const imgData = fs.readFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/.user_uploaded/media_1792715711507_c74bf52a.png').toString('base64');
    await send('Page.navigate', { url: 'data:text/html,<html><body style=\"margin:0\"><img id=\"img\" src=\"data:image/png;base64,' + imgData + '\"/></body></html>' });
    await sleep(1500);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        return r.result.value;
    };

    // Analyze the image via canvas
    const analysis = await evalJs(`
        (function() {
            const img = document.getElementById('img');
            const cv = document.createElement('canvas');
            cv.width = img.naturalWidth;
            cv.height = img.naturalHeight;
            const ctx = cv.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Search for green circles (stroke start badges have a green border / fill)
            // #2e8b57 (rgb: 46, 139, 87) or #4caf50 (rgb: 76, 175, 80)
            const idata = ctx.getImageData(0, 0, cv.width, cv.height).data;
            const greenPixels = [];
            for (let y = 0; y < cv.height; y++) {
                for (let x = 0; x < cv.width; x++) {
                    const idx = (y * cv.width + x) * 4;
                    const r = idata[idx], g = idata[idx + 1], b = idata[idx + 2];
                    // green is significantly higher than red and blue
                    if (g > 100 && g > r * 1.3 && g > b * 1.3) {
                        greenPixels.push([x, y]);
                    }
                }
            }
            return {
                w: cv.width,
                h: cv.height,
                greenCount: greenPixels.length,
                greenSample: greenPixels.slice(0, 50)
            };
        })()
    `);

    console.log('Image analysis:', analysis.w, 'x', analysis.h, 'green pixels:', analysis.greenCount);

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
