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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1500);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        return r.result.value;
    };

    const glyphAnalysis = await evalJs(`
        (function() {
            // Analyze ink distribution of '획' and '순'
            function analyzeChar(ch) {
                const cv = document.createElement('canvas');
                cv.width = 100;
                cv.height = 100;
                const ctx = cv.getContext('2d');
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'normal 81px "궁서", "Gungsuh", serif';
                ctx.fillText(ch, 50, 50);
                const img = ctx.getImageData(0, 0, 100, 100).data;
                const ink = [];
                for (let y = 0; y < 100; y++) {
                    for (let x = 0; x < 100; x++) {
                        if (img[(y * 100 + x) * 4 + 3] > 100) {
                            ink.push([x, y]);
                        }
                    }
                }
                // Find horizontal bar around y=45..60
                const horizSlices = [];
                for (let y = 0; y < 100; y++) {
                    const row = ink.filter(p => p[1] === y);
                    if (row.length > 0) {
                        const xs = row.map(p => p[0]);
                        horizSlices.push({ y, minX: Math.min(...xs), maxX: Math.max(...xs), count: row.length });
                    }
                }
                return { ch, totalInk: ink.length, slices: horizSlices };
            }
            return {
                hoik: analyzeChar('획'),
                soon: analyzeChar('순')
            };
        })()
    `);

    console.log('--- 획 Ink Rows ---');
    glyphAnalysis.hoik.slices.filter(s => s.y >= 35 && s.y <= 65).forEach(s => {
        console.log(`y=${s.y.toString().padStart(2, ' ')}: minX=${s.minX} maxX=${s.maxX} width=${s.maxX - s.minX} count=${s.count}`);
    });

    console.log('\n--- 순 Ink Rows ---');
    glyphAnalysis.soon.slices.filter(s => s.y >= 40 && s.y <= 70).forEach(s => {
        console.log(`y=${s.y.toString().padStart(2, ' ')}: minX=${s.minX} maxX=${s.maxX} width=${s.maxX - s.minX} count=${s.count}`);
    });

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
