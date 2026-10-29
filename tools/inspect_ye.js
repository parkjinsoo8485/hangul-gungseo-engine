const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9997;
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
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 50; i++) {
        try {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
        } catch (e) { }
        await sleep(200);
    }

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const chars = ['예', '에', '얘', '애', '여', '어', '야', '아', '옛', '옝', '계', '례', '혜', '몌', '폐', '세', '네'];
            const out = {};
            for (const ch of chars) {
                Engine.loadText(ch);
                const jb = Engine.dynBounds && Engine.dynBounds[0];
                const entries = (Engine.jamoEntries || []).map(e => ({
                    whId: e.whId,
                    part: e.part,
                    subPart: e.subPart,
                    box: e.box,
                    fbox: e.fbox,
                    so: e.so,
                    norm: e.norm
                }));
                const strokes = Engine.strokes.map((pts, i) => {
                    let minX = 999, maxX = -999, minY = 999, maxY = -999;
                    pts.forEach(p => {
                        if (p[0] < minX) minX = p[0];
                        if (p[0] > maxX) maxX = p[0];
                        if (p[1] < minY) minY = p[1];
                        if (p[1] > maxY) maxY = p[1];
                    });
                    return {
                        idx: i + 1,
                        whId: Engine.strokeMeta[i] ? Engine.strokeMeta[i].whId : '',
                        part: Engine.strokeMeta[i] ? Engine.strokeMeta[i].part : '',
                        start: pts[0] ? [Number(pts[0][0].toFixed(1)), Number(pts[0][1].toFixed(1))] : null,
                        end: pts[pts.length - 1] ? [Number(pts[pts.length - 1][0].toFixed(1)), Number(pts[pts.length - 1][1].toFixed(1))] : null,
                        bbox: [Number(minX.toFixed(1)), Number(minY.toFixed(1)), Number(maxX.toFixed(1)), Number(maxY.toFixed(1))],
                        len: pts.length
                    };
                });
                // Also inspect actual pixel ownership per stroke!
                const gd = Engine.glyphData && Engine.glyphData[0];
                const sCounts = {};
                const sBbox = {};
                if (gd) {
                    const R = 360;
                    for (let k = 0; k < gd.idx.length; k++) {
                        const pIdx = gd.idx[k];
                        const lx = (pIdx % R) * 100 / R;
                        const ly = Math.floor(pIdx / R) * 100 / R;
                        const sid = gd.sid[k] + 1;
                        sCounts[sid] = (sCounts[sid] || 0) + 1;
                        if (!sBbox[sid]) sBbox[sid] = [lx, ly, lx, ly];
                        else {
                            if (lx < sBbox[sid][0]) sBbox[sid][0] = lx;
                            if (ly < sBbox[sid][1]) sBbox[sid][1] = ly;
                            if (lx > sBbox[sid][2]) sBbox[sid][2] = lx;
                            if (ly > sBbox[sid][3]) sBbox[sid][3] = ly;
                        }
                    }
                    for (const sid in sBbox) {
                        sBbox[sid] = sBbox[sid].map(v => Number(v.toFixed(1)));
                    }
                }
                out[ch] = { jb, entries, strokes, sCounts, sBbox };
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    console.log('=== 예 DETAIL ===');
    console.log(JSON.stringify(data['예'], null, 2));
    for (const ch of Object.keys(data)) {
        if (ch === '예') continue;
        console.log(`=== ${ch} ===`);
        console.log('jb.splitX:', (data[ch].jb.splitX * 100 / 360).toFixed(1), 'stemX_V:', (data[ch].jb.stemX_V * 100 / 360).toFixed(1));
        console.log('strokes:', JSON.stringify(data[ch].strokes));
        console.log('sBbox:', JSON.stringify(data[ch].sBbox));
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
