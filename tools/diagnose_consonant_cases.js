const http = require('http');
const PORT = 9946;
const { spawn } = require('child_process');

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_diag_cho_' + PORT,
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
            try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) {}
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
        await send('Page.navigate', { url: 'http://localhost:8080/index.html?t=' + Date.now() });
        for (let i = 0; i < 40; i++) {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
            await sleep(250);
        }

        const targets = ['ㄷ', 'ㅈ', 'ㅎ', 'ㅃ', '존', '톤', '꽈', '꼄', '뀍', '뻐', '빡', '빽', '쏜', '쏙', '째', '쪄', '쪎', '효', '흐', '텐', '련', '뤈', '퐨'];
        const res = await send('Runtime.evaluate', {
            expression: `(() => {
                const out = {};
                for (const ch of ${JSON.stringify(targets)}) {
                    Engine.loadText(ch);
                    const g = Engine.glyphData;
                    const R = g.R, W = g.W;
                    const jb = Engine.dynBounds && Engine.dynBounds[0];
                    const alphaBuf = new Uint8Array(W * R);
                    for (let i = 0; i < g.idx.length; i++) alphaBuf[g.idx[i]] = g.a[i];
                    const hasInkNear = (px, py, rad = 3) => {
                        for (let dy = -rad; dy <= rad; dy++) {
                            const ny = py + dy;
                            if (ny < 0 || ny >= R) continue;
                            for (let dx = -rad; dx <= rad; dx++) {
                                const nx = px + dx;
                                if (nx < 0 || nx >= W) continue;
                                if (alphaBuf[ny * W + nx] >= 20) return true;
                            }
                        }
                        return false;
                    };
                    const pxCounts = new Array(Engine.strokes.length).fill(0);
                    for (let i = 0; i < g.key.length; i++) {
                        const s = Math.floor(g.key[i] / 4096);
                        if (s >= 0 && s < pxCounts.length) pxCounts[s]++;
                    }
                    const fboxes = Engine.jamoEntries.map(e => ({ part: e.part, whId: e.whId, fbox: e.fbox && e.fbox.map(v => +v.toFixed(1)), so: e.so && e.so.map(s => s.map(v => +v.toFixed(1))) }));
                    const strokes = Engine.strokes.map((st, sIdx) => {
                        let onInk = 0;
                        const offPts = [];
                        st.forEach((p, pi) => {
                            const px = Math.round(p[0] * R / 100);
                            const py = Math.round(p[1] * R / 100);
                            if (hasInkNear(px, py, 3)) onInk++;
                            else if (offPts.length < 4) offPts.push([+p[0].toFixed(1), +p[1].toFixed(1)]);
                        });
                        return {
                            s: sIdx + 1,
                            whId: (Engine.strokeMeta[sIdx] && Engine.strokeMeta[sIdx].whId) || 'single',
                            ratio: +(onInk / st.length).toFixed(2),
                            px: pxCounts[sIdx],
                            p0: [+st[0][0].toFixed(1), +st[0][1].toFixed(1)],
                            pMid: [+st[Math.floor(st.length/2)][0].toFixed(1), +st[Math.floor(st.length/2)][1].toFixed(1)],
                            p1: [+st[st.length - 1][0].toFixed(1), +st[st.length - 1][1].toFixed(1)],
                            offPts
                        };
                    });
                    out[ch] = {
                        jb: jb ? {
                            minX: +(jb.minX * 100 / R).toFixed(1), maxX: +(jb.maxX * 100 / R).toFixed(1),
                            minY: +(jb.minY * 100 / R).toFixed(1), maxY: +(jb.maxY * 100 / R).toFixed(1),
                            choX1: jb.choX1 ? +(jb.choX1 * 100 / R).toFixed(1) : null,
                            choX2: jb.choX2 ? +(jb.choX2 * 100 / R).toFixed(1) : null,
                            choY1: jb.choY1 ? +(jb.choY1 * 100 / R).toFixed(1) : null,
                            choY2: jb.choY2 ? +(jb.choY2 * 100 / R).toFixed(1) : null,
                            splitX: +(jb.splitX * 100 / R).toFixed(1)
                        } : null,
                        fboxes,
                        strokes
                    };
                }
                return out;
            })()`,
            returnByValue: true
        });

        for (const [ch, d] of Object.entries(res.result.value)) {
            console.log(`=== ${ch} ===`, JSON.stringify(d.jb), JSON.stringify(d.fboxes));
            for (const s of d.strokes) {
                if (s.ratio < 0.85 || s.px === 0) {
                    console.log(`  #${s.s} (${s.whId}): ratio=${s.ratio}, px=${s.px}, ${JSON.stringify(s.p0)} -> ${JSON.stringify(s.pMid)} -> ${JSON.stringify(s.p1)}, off=${JSON.stringify(s.offPts)}`);
                }
            }
        }
        ws.close();
    } finally {
        chrome.kill();
    }
})();
