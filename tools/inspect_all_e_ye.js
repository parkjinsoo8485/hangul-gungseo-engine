const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9994;
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
            const chos = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
            const jungs = ['ㅔ','ㅖ','ㅓ','ㅕ','ㅐ','ㅒ'];
            const out = [];
            for (const j of jungs) {
                for (const c of chos) {
                    const code = 0xAC00 + (chos.indexOf(c) * 21 + ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'].indexOf(j)) * 28;
                    const ch = String.fromCharCode(code);
                    Engine.loadText(ch);
                    const jb = Engine.dynBounds && Engine.dynBounds[0];
                    const choEntry = Engine.jamoEntries.find(e => e.part === 'cho');
                    const jungEntry = Engine.jamoEntries.find(e => e.part === 'jung');
                    const st = Engine.strokes.map((pts, idx) => ({
                        idx: idx + 1,
                        part: Engine.strokeMeta[idx].part,
                        x0: Number(pts[0][0].toFixed(1)),
                        y0: Number(pts[0][1].toFixed(1)),
                        x1: Number(pts[pts.length - 1][0].toFixed(1)),
                        y1: Number(pts[pts.length - 1][1].toFixed(1))
                    }));
                    out.push({
                        ch, c, j,
                        splitX: Number((jb.splitX * 100 / 360).toFixed(1)),
                        stemX_V: Number((jb.stemX_V * 100 / 360).toFixed(1)),
                        choFbox: choEntry.fbox.map(v => Number(v.toFixed(1))),
                        jungFbox: jungEntry.fbox.map(v => Number(v.toFixed(1))),
                        jungSo: jungEntry.so,
                        strokes: st
                    });
                }
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    for (const item of data.filter(d => d.j === 'ㅖ' || d.j === 'ㅔ')) {
        const jungSt = item.strokes.filter(s => s.part === 'jung');
        console.log(`${item.ch} (splitX=${item.splitX}, stemX_V=${item.stemX_V}) choFbox=[${item.choFbox}] jungFbox=[${item.jungFbox}] jungStrokes=${JSON.stringify(jungSt.map(s => `${s.idx}:(${s.x0},${s.y0})->(${s.x1},${s.y1})`))}`);
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
