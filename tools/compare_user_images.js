const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const PORT = 9992;
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

    const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

    const b64_1 = fs.readFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/user_dalm_1.png').toString('base64');
    const b64_2 = fs.readFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/user_dalm_2.png').toString('base64');

    const res = await evalJs(`(async () => {
        const loadImage = b64 => new Promise(res => {
            const img = new Image();
            img.onload = () => res(img);
            img.src = 'data:image/png;base64,' + b64;
        });
        const img1 = await loadImage('${b64_1}');
        const img2 = await loadImage('${b64_2}');

        const analyze = img => {
            const cv = document.createElement('canvas');
            cv.width = img.width; cv.height = img.height;
            const ctx = cv.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const d = ctx.getImageData(0, 0, img.width, img.height).data;

            // Find green pixels (badge centers): R < 80, G > 120, B < 100
            const greenPixels = [];
            for (let y = 0; y < img.height; y++) {
                for (let x = 0; x < img.width; x++) {
                    const idx = (y * img.width + x) * 4;
                    const r = d[idx], g = d[idx+1], b = d[idx+2];
                    if (g > 110 && r < 70 && b < 100) {
                        greenPixels.push({ x, y });
                    }
                }
            }

            // Cluster green pixels to find badge centers
            const clusters = [];
            greenPixels.forEach(p => {
                let found = false;
                for (const c of clusters) {
                    if (Math.hypot(c.cx - p.x, c.cy - p.y) < 25) {
                        c.pts.push(p);
                        c.cx = c.pts.reduce((s, pt) => s + pt.x, 0) / c.pts.length;
                        c.cy = c.pts.reduce((s, pt) => s + pt.y, 0) / c.pts.length;
                        found = true;
                        break;
                    }
                }
                if (!found) clusters.push({ cx: p.x, cy: p.y, pts: [p] });
            });

            return {
                width: img.width, height: img.height,
                badgeCount: clusters.length,
                badges: clusters.map(c => ({
                    xPct: ((c.cx / img.width) * 100).toFixed(1),
                    yPct: ((c.cy / img.height) * 100).toFixed(1)
                }))
            };
        };

        return {
            img1: analyze(img1),
            img2: analyze(img2)
        };
    })()`);

    console.log(JSON.stringify(res, null, 2));

    ws.close();
    chrome.kill();
}
main().catch(console.error);
