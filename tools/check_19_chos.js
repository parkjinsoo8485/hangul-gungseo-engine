const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9995;
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
        await sleep(250);
    }

    const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

    // Test all 19 cho with 'ㅏ' + 'ㄻ' (e.g. 갊, 깖, 낢, 닮, 땚, 랆, 맒, 밞,  빠, 삶, 쌂, 앎, 잠, 짬, 참, 캄, 탐, 팜, 함)
    const chos = ['갊', '깖', '낢', '닮', '땚', '랆', '맒', '밞', ' 빠'[1] ? '빰' : '빰', '삶', '쌂', '앎', '잚', '짧', '챎', '캄', '탊', '퍎', '핢'];
    for (const ch of chos) {
        const res = await evalJs(`(() => {
            Engine.loadText('${ch}');
            const g = Engine.glyphData;
            const R = g.R, W = g.W;
            const jb = Engine.dynBounds[0];
            let lastChoIdx = -1;
            Engine.strokeMeta.forEach((m, i) => { if (m.part === 'cho') lastChoIdx = i; });
            const choSt = Engine.strokes[lastChoIdx];
            const choEnd = choSt[choSt.length - 1];
            const choPrev = choSt[Math.max(0, choSt.length - 5)];
            const dx = choEnd[0] - choPrev[0], dy = choEnd[1] - choPrev[1];
            const isLastH = dx > Math.abs(dy) * 1.5;

            let firstJungIdx = -1;
            Engine.strokeMeta.forEach((m, i) => { if (m.part === 'jung' && firstJungIdx < 0) firstJungIdx = i; });
            const jungSt = Engine.strokes[firstJungIdx];
            const stemX = jungSt[0][0];

            // Check if there is a continuous horizontal ink bridge between splitX and stemX at choEnd Y
            const py = Math.round(choEnd[1] * R / 100);
            let bridgeContinuous = true;
            for (let x = jb.splitX; x <= Math.round(stemX * R / 100) - 4; x += 2) {
                let colHasInk = false;
                for (let d = -8; d <= 8; d++) {
                    const idx = g.idx.indexOf((py + d) * W + x);
                    if (idx >= 0 && g.a[idx] > 80) { colHasInk = true; break; }
                }
                if (!colHasInk) { bridgeContinuous = false; break; }
            }

            let assignedToChoRightX = 0;
            for (let x = Math.round(choEnd[0] * R / 100) - 20; x <= Math.round(stemX * R / 100); x++) {
                for (let d = -6; d <= 6; d++) {
                    const idx = g.idx.indexOf((py + d) * W + x);
                    if (idx >= 0 && g.a[idx] > 80) {
                        const s = Math.floor(g.key[idx] / 4096);
                        if (s === lastChoIdx && x > assignedToChoRightX) assignedToChoRightX = x;
                    }
                }
            }

            return {
                ch: '${ch}',
                whId: Engine.strokeMeta[lastChoIdx].whId,
                isLastH,
                bridgeContinuous,
                choEndX: choEnd[0].toFixed(1),
                stemX: stemX.toFixed(1),
                assignedToChoRightXPct: (assignedToChoRightX * 100 / R).toFixed(1),
                splitXPct: (jb.splitX * 100 / R).toFixed(1)
            };
        })()`);
        console.log(JSON.stringify(res));
    }

    ws.close();
    chrome.kill();
}
main().catch(console.error);
