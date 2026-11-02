const http = require('http');
const PORT = 9947;
const { spawn } = require('child_process');

const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_diag_rem_' + PORT,
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

        const targets = ['ㄱ', 'ㄹ', 'ㅃ', 'ㅆ', 'ㅉ', '꽈', '빠', '뻐', '뼈', '삐', '싸', '써', '쎠', '씨', '짜', '쩌', '째', '쪄', '찌', '뀍', '텐', '련', '뤈'];
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
                            p0: [+st[0][0].toFixed(1), +st[0][1].toFixed(1)],
                            pMid: [+st[Math.floor(st.length/2)][0].toFixed(1), +st[Math.floor(st.length/2)][1].toFixed(1)],
                            p1: [+st[st.length - 1][0].toFixed(1), +st[st.length - 1][1].toFixed(1)],
                            offPts
                        };
                    }).filter(st => st.ratio < 0.78);
                    out[ch] = {
                        jb: jb ? {
                            minX: +(jb.minX * 100 / R).toFixed(1), maxX: +(jb.maxX * 100 / R).toFixed(1),
                            minY: +(jb.minY * 100 / R).toFixed(1), maxY: +(jb.maxY * 100 / R).toFixed(1),
                            choX1: jb.choX1 ? +(jb.choX1 * 100 / R).toFixed(1) : null,
                            choX2: jb.choX2 ? +(jb.choX2 * 100 / R).toFixed(1) : null,
                            choY1: jb.choY1 ? +(jb.choY1 * 100 / R).toFixed(1) : null,
                            choY2: jb.choY2 ? +(jb.choY2 * 100 / R).toFixed(1) : null,
                            splitX: jb.splitX ? +(jb.splitX * 100 / R).toFixed(1) : null
                        } : null,
                        fboxes,
                        strokes
                    };
                }
                return JSON.stringify(out);
            })()`,
            returnByValue: true
        });
        const data = JSON.parse(res.result.value);
        for (const [ch, v] of Object.entries(data)) {
            console.log('===', ch, '=== jb:', JSON.stringify(v.jb), 'fbox:', JSON.stringify(v.fboxes[0]));
            v.strokes.forEach(s => console.log('  stroke', JSON.stringify(s)));
        }
        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
})();
