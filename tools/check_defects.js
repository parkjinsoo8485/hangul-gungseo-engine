const fs = require('fs');
const http = require('http');

const PORT = 9976;
const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));

async function run() {
    const list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list'));
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

    const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

    const testChars = ['맨', '둿', '뙯', '럽'];
    for (const ch of testChars) {
        const res = await evalJs(`(() => {
            Engine.loadText('${ch}');
            const strokes = Engine.strokes;
            const meta = Engine.strokeMeta;
            const g = Engine.glyphData;
            const R = g.R, W = g.W;
            const info = [];
            strokes.forEach((pts, i) => {
                let air = 0;
                const step = Math.max(1, Math.floor(pts.length / 6));
                const samples = [];
                for (let pi = 1; pi < pts.length - 1; pi += step) {
                    const px = Math.round(pts[pi][0] * R / 100);
                    const py = Math.round(pts[pi][1] * R / 100);
                    const pIdx = py * W + px;
                    const idx = g.idx.indexOf(pIdx);
                    const alpha = idx >= 0 ? g.a[idx] : 0;
                    if (alpha < 20) air++;
                    samples.push({ px, py, alpha });
                }
                info.push({
                    sIdx: i + 1,
                    whId: meta[i] && meta[i].whId,
                    part: meta[i] && meta[i].part,
                    air,
                    totalSamples: samples.length,
                    samples,
                    ptsRange: {
                        x0: pts[0][0], y0: pts[0][1],
                        xEnd: pts[pts.length-1][0], yEnd: pts[pts.length-1][1]
                    }
                });
            });
            return {
                ch: '${ch}',
                dynBounds: Engine.dynBounds[0],
                placedEntries: Engine.placedEntries.map(e => ({ part: e.part, subPart: e.subPart, whId: e.whId, fbox: e.fbox })),
                strokes: info
            };
        })()`);
        console.log('=== Character ' + ch + ' ===');
        console.log(JSON.stringify(res, null, 2));
    }

    ws.close();
}

run().catch(console.error);
