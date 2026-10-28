const { spawn } = require('child_process'), http = require('http');
const PORT = 9953;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT, 'about:blank'
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1500);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        return r.result.value;
    };

    const res = await evalJs(`(() => {
        const chars = ['팧', '괜', '괴', '권', '흰', '나', '너', '니', '러', '히', '훈', '민', '정'];
        const out = {};
        const R = 100;
        const cv = document.createElement('canvas');
        cv.width = R; cv.height = R;
        const ctx = cv.getContext('2d');
        for (const ch of chars) {
            ctx.clearRect(0, 0, R, R);
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal 81px "궁서","Gungsuh","GungsuhChe",serif';
            ctx.fillText(ch, R / 2, R / 2);
            const d = ctx.getImageData(0, 0, R, R).data;
            // Find connected components of ink (alpha > 80)
            const vis = new Uint8Array(R * R);
            const comps = [];
            for (let y = 0; y < R; y++) {
                for (let x = 0; x < R; x++) {
                    if (d[(y * R + x) * 4 + 3] > 80 && !vis[y * R + x]) {
                        let minX = x, maxX = x, minY = y, maxY = y, count = 0;
                        const q = [[x, y]];
                        vis[y * R + x] = 1;
                        while (q.length) {
                            const [cx, cy] = q.pop();
                            count++;
                            if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
                            if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    const nx = cx + dx, ny = cy + dy;
                                    if (nx >= 0 && nx < R && ny >= 0 && ny < R && !vis[ny * R + nx] && d[(ny * R + nx) * 4 + 3] > 80) {
                                        vis[ny * R + nx] = 1;
                                        q.push([nx, ny]);
                                    }
                                }
                            }
                        }
                        if (count >= 5) comps.push({ minX, maxX, minY, maxY, count });
                    }
                }
            }
            out[ch] = comps;
        }
        return out;
    })()`);

    for (const [ch, comps] of Object.entries(res)) {
        console.log(`\n=== [${ch}] Ink Components (100x100) ===`);
        comps.forEach((c, i) => console.log(`  Comp ${i}: x=[${c.minX}..${c.maxX}] y=[${c.minY}..${c.maxY}] (px=${c.count})`));
    }

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
