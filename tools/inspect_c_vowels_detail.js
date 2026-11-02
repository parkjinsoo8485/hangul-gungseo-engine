const { spawn } = require('child_process'), http = require('http');
const PORT = 9982;
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
            const R = 360;
            const ff = Engine.styleParams.fontFamily;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;

            const chars = ['와','과','돠','왜','괘','돼','왝','괙','돽','외','괴','되','워','궈','둬','웨','궤','뒈','위','귀','뒤'];
            const out = {};
            for (const ch of chars) {
                Engine.loadText(ch);
                ctx.clearRect(0, 0, R, R);
                ctx.fillText(ch, R / 2, R / 2);
                const img = ctx.getImageData(0, 0, R, R).data;
                const jb = Engine.dynBounds[0];
                // Find actual vertical tick of ㅗ in 와/과/왜/외 above yBarC!
                // Wait: yBarC is at jb.yBarC. Above yBarC (from jb.choY2 to jb.yBarC - 4), where is the vertical tick of ㅗ?
                const yBar = jb.yBarC;
                const yScan1 = Math.max(jb.minY, yBar - Math.round(R * 0.14));
                const yScan2 = yBar - Math.round(R * 0.03);
                const oCols = [];
                for (let x = jb.minX; x <= jb.splitX - 2; x++) {
                    let s = 0;
                    for (let y = yScan1; y <= yScan2; y++) if (img[(y * R + x) * 4 + 3] > 80) s++;
                    if (s > 0) oCols.push({ x: Number((x * 100 / R).toFixed(1)), s });
                }
                out[ch] = {
                    jb: {
                        choY2: Number((jb.choY2 * 100 / R).toFixed(1)),
                        yBarC: Number((jb.yBarC * 100 / R).toFixed(1)),
                        splitX: Number((jb.splitX * 100 / R).toFixed(1)),
                        stemX_C: Number((jb.stemX_C * 100 / R).toFixed(1)),
                        stemX_U: jb.stemX_U ? Number((jb.stemX_U * 100 / R).toFixed(1)) : null
                    },
                    entries: Engine.jamoEntries.map(e => ({ sub: e.subPart, fbox: e.fbox.map(v => Number(v.toFixed(1))), so: e.so.map(s => s.map(v => Number(v.toFixed(1)))) })),
                    strokes: Engine.strokes.map((pts, i) => ({
                        i: i + 1,
                        sub: Engine.strokeMeta[i].subPart,
                        p0: [Number(pts[0][0].toFixed(1)), Number(pts[0][1].toFixed(1))],
                        p1: [Number(pts[pts.length - 1][0].toFixed(1)), Number(pts[pts.length - 1][1].toFixed(1))]
                    }))
                };
            }
            return JSON.stringify(out, null, 2);
        })()`,
        returnByValue: true
    });

    console.log(res.result.value);
    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
