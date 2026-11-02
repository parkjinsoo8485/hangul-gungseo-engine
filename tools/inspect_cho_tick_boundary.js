const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9988;
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
            const targetJungs = ['ㅓ','ㅔ','ㅕ','ㅖ'];

            const out = {};
            for (const j of targetJungs) {
                out[j] = [];
                for (const c of chos) {
                    for (const jongIdx of [0, 1]) {
                        const code = 0xAC00 + (chos.indexOf(c) * 21 + jungs.indexOf(j)) * 28 + jongIdx;
                        const ch = String.fromCharCode(code);
                        ctx.clearRect(0, 0, R, R);
                        ctx.fillText(ch, R / 2, R / 2);
                        const img = ctx.getImageData(0, 0, R, R).data;
                        const jb = computeDynamicJamoBounds(img, 0, 1, R, { cho: c, jung: j, jong: jongIdx ? 'ㄱ' : '' }, 'V', !!jongIdx);
                        const yUpperEnd = jongIdx ? jb.choY2 : jb.maxY;

                        // Find stem1X
                        let stem1X = jb.stemX_V;
                        if (j === 'ㅔ' || j === 'ㅖ') {
                            let maxS1 = -1;
                            const scanS = Math.round(jb.minX + (jb.maxX - jb.minX) * 0.46);
                            const scanE = jb.stemX_V - Math.round(R * 0.08);
                            const cols = [];
                            for (let x = scanS; x <= scanE; x++) {
                                let sum = 0;
                                for (let y = jb.minY; y <= yUpperEnd; y++) if (img[(y * R + x) * 4 + 3] > 50) sum++;
                                cols.push({ x, sum });
                                if (sum > maxS1) maxS1 = sum;
                            }
                            const p1 = cols.filter(cs => cs.sum >= maxS1 * 0.85);
                            if (p1.length) stem1X = Math.round((p1[0].x + p1[p1.length - 1].x) * 0.5);
                        }

                        // Let's find the Y rows where the left tick(s) of the vowel are!
                        // For ㅓ/ㅔ, there is 1 tick around 35..52% (no jong) or 22..40% (with jong).
                        // For ㅕ/ㅖ, there are 2 ticks!
                        // How to find splitX between Cho and the Left Tick(s)?
                        // Wait: in rows NOT containing the left ticks, there is a HUGE gap between Cho and stem1X!
                        // Wait: where does Cho end on the right (choX2), and where do the Left Ticks start on the left (tickX1)?
                        // Let's check for each x in [minX + 0.35*(maxX-minX), stem1X - 4]:
                        // How many ink pixels are in column x for y in [minY, yUpperEnd]?
                        const colProfile = [];
                        const xS = Math.round(jb.minX + (jb.maxX - jb.minX) * 0.42);
                        const xE = stem1X - 5;
                        for (let x = xS; x <= xE; x++) {
                            let sum = 0;
                            for (let y = jb.minY; y <= yUpperEnd; y++) {
                                if (img[(y * R + x) * 4 + 3] > 50) sum++;
                            }
                            colProfile.push({ xp: Number((x * 100 / R).toFixed(1)), sum });
                        }
                        out[j].push({
                            ch, c, hasJong: !!jongIdx,
                            stem1Xp: Number((stem1X * 100 / R).toFixed(1)),
                            stem2Xp: Number((jb.stemX_V * 100 / R).toFixed(1)),
                            colProfile: colProfile.map(cp => cp.xp + ':' + cp.sum).join(' ')
                        });
                    }
                }
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    for (const j of ['ㅔ', 'ㅖ']) {
        console.log(`=== ${j} (no jong) ===`);
        for (const d of data[j].filter(x => !x.hasJong)) {
            console.log(`${d.ch} (s1=${d.stem1Xp}): ${d.colProfile}`);
        }
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
