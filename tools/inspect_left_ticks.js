const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9989;
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
            const R = 360;
            const ff = Engine.styleParams.fontFamily;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;

            const chos = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
            const jungs = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];

            const out = [];
            for (const j of ['ㅔ', 'ㅖ', 'ㅓ', 'ㅕ']) {
                for (const c of chos) {
                    const code = 0xAC00 + (chos.indexOf(c) * 21 + jungs.indexOf(j)) * 28;
                    const ch = String.fromCharCode(code);
                    ctx.clearRect(0, 0, R, R);
                    ctx.fillText(ch, R / 2, R / 2);
                    const img = ctx.getImageData(0, 0, R, R).data;
                    const jb = computeDynamicJamoBounds(img, 0, 1, R, { cho: c, jung: j, jong: '' }, 'V', false);

                    // Find stem1X
                    let stem1X = jb.stemX_V;
                    if (j === 'ㅔ' || j === 'ㅖ') {
                        let maxS1 = -1;
                        const scanS = Math.round(jb.minX + (jb.maxX - jb.minX) * 0.50);
                        const scanE = jb.stemX_V - Math.round(R * 0.07);
                        const cols = [];
                        for (let x = scanS; x <= scanE; x++) {
                            let sum = 0;
                            for (let y = jb.minY; y <= jb.maxY; y++) if (img[(y * R + x) * 4 + 3] > 50) sum++;
                            cols.push({ x, sum });
                            if (sum > maxS1) maxS1 = sum;
                        }
                        const p1 = cols.filter(cs => cs.sum >= maxS1 * 0.85);
                        if (p1.length) stem1X = Math.round((p1[0].x + p1[p1.length - 1].x) * 0.5);
                    }

                    // Scan rows in [25%..65%] to the left of stem1X - 4 up to stem1X - 35
                    const y1 = Math.round(R * 0.25), y2 = Math.round(R * 0.65);
                    const rowProfile = [];
                    for (let y = y1; y <= y2; y++) {
                        let run = 0, minTickX = stem1X - 4;
                        for (let x = stem1X - 4; x >= stem1X - 36; x--) {
                            if (img[(y * R + x) * 4 + 3] > 80) { run++; minTickX = x; }
                            else break;
                        }
                        if (run >= 3) rowProfile.push({ yp: Number((y * 100 / R).toFixed(1)), run, leftXp: Number((minTickX * 100 / R).toFixed(1)) });
                    }
                    out.push({ ch, c, j, stem1Xp: Number((stem1X * 100 / R).toFixed(1)), stem2Xp: Number((jb.stemX_V * 100 / R).toFixed(1)), rowProfile });
                }
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    for (const d of data.filter(x => ['예','에','계','게','혜','헤','네','녜','뎨','례'].includes(x.ch))) {
        console.log(`${d.ch} (s1=${d.stem1Xp}, s2=${d.stem2Xp}):`, d.rowProfile.map(r => `${r.yp}%(L=${r.leftXp},w=${r.run})`).join(' '));
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
