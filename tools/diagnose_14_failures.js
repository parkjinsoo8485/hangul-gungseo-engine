const { spawn } = require('child_process'), http = require('http');
const PORT = 9952;
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

    const targets = ['팧', '괜', '괴', '권', '흰', '나', '너', '니', '러', '히', '훈', '민', '정'];
    for (const ch of targets) {
        const res = await evalJs(`(() => {
            Engine.loadText('${ch}');
            const g = Engine.glyphData;
            const R = g.R;
            const inkGrid = new Uint8Array(g.W * g.H);
            for (let i = 0; i < g.idx.length; i++) inkGrid[g.idx[i]] = 1;

            const jb = Engine.dynBounds && Engine.dynBounds[0];
            const entries = Engine.jamoEntries.map(e => ({
                part: e.part,
                whId: e.whId,
                box: e.box.map(v => Math.round(v*10)/10),
                fbox: e.fbox ? e.fbox.map(v => Math.round(v*10)/10) : null,
                so: e.so ? e.so.map(s => [Math.round(s[0]*10)/10, Math.round(s[1]*10)/10]) : null
            }));

            const strokes = Engine.strokes.map((pts, sIdx) => {
                let onInk = 0;
                pts.forEach(p => {
                    const px = Math.round(p[0] * R / 100), py = Math.round(p[1] * R / 100);
                    let hit = false;
                    for (let dy = -5; dy <= 5 && !hit; dy++) {
                        for (let dx = -5; dx <= 5 && !hit; dx++) {
                            const x = px + dx, y = py + dy;
                            if (x >= 0 && x < g.W && y >= 0 && y < g.H && inkGrid[y * g.W + x]) hit = true;
                        }
                    }
                    if (hit) onInk++;
                });
                return {
                    sIdx: sIdx + 1,
                    part: Engine.strokeMeta[sIdx]?.part,
                    ratio: Math.round(onInk / pts.length * 1000) / 10,
                    start: [Math.round(pts[0][0]*10)/10, Math.round(pts[0][1]*10)/10],
                    end: [Math.round(pts[pts.length-1][0]*10)/10, Math.round(pts[pts.length-1][1]*10)/10]
                };
            });
            return {
                ch: '${ch}',
                jb: jb ? {
                    splitX: Math.round(jb.splitX / (R/100) * 10) / 10,
                    choY1: Math.round(jb.choY1 / (R/100) * 10) / 10,
                    choY2: Math.round(jb.choY2 / (R/100) * 10) / 10,
                    jungY1: Math.round(jb.jungY1 / (R/100) * 10) / 10,
                    jungY2: Math.round(jb.jungY2 / (R/100) * 10) / 10,
                    jongY1: Math.round(jb.jongY1 / (R/100) * 10) / 10
                } : null,
                entries,
                strokes
            };
        })()`);
        console.log(`\n=== [${res.ch}] dynBounds=${JSON.stringify(res.jb)} ===`);
        res.entries.forEach(e => console.log(`  Entry ${e.part} (${e.whId}): box=[${e.box}] -> fbox=[${e.fbox}] so=${JSON.stringify(e.so)}`));
        res.strokes.forEach(s => console.log(`  Stroke ${s.sIdx} (${s.part}): ${s.ratio}% onInk, start=(${s.start}) end=(${s.end})`));
    }

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
