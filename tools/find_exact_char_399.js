const http = require('http');
const PORT = 9998;
const fs = require('fs');
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_399_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 30; i++) {
        const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
        if (chk.result && chk.result.value) break;
        await sleep(300);
    }

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    };

    const chos = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    const jungs = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];

    const matches = [];
    console.log('Testing 399 no-batchim syllables...');

    for (const c of chos) {
        for (const j of jungs) {
            const code = 0xAC00 + (chos.indexOf(c) * 21 + jungs.indexOf(j)) * 28;
            const ch = String.fromCharCode(code);
            const res = await evalJs(`(() => {
                Engine.loadText('${ch}');
                const strokes = Engine.strokes;
                const badges = (Engine.badgePositions || []).map(b => [Math.round(b.bx), Math.round(b.by)]);
                return {
                    ch: '${ch}',
                    count: strokes.length,
                    badges
                };
            })()`);

            // In user's image:
            // Badge 1 (16): top-left [15..25, 20..30]
            // Badge 2 (17): just below 16 [17..27, 26..36]
            // Badge 3 (18): middle horiz [40..55, 40..52]
            // Badge 4 (19): lower-left [18..28, 42..52]
            // Badge 5 (20): top-right stem [60..72, 10..20]
            if (res.count === 5 && res.badges.length === 5) {
                const b = res.badges;
                // b[0] top-left, b[1] below b[0], b[2] middle horiz, b[3] lower-left, b[4] top-right
                const match1 = b[0][0] >= 14 && b[0][0] <= 30 && b[0][1] >= 18 && b[0][1] <= 32;
                const match2 = b[1][0] >= 15 && b[1][0] <= 32 && b[1][1] >= 25 && b[1][1] <= 40;
                const match3 = b[2][0] >= 35 && b[2][0] <= 58 && b[2][1] >= 38 && b[2][1] <= 55;
                const match4 = b[3][0] >= 15 && b[3][0] <= 32 && b[3][1] >= 40 && b[3][1] <= 55;
                const match5 = b[4][0] >= 58 && b[4][0] <= 75 && b[4][1] >= 8 && b[4][1] <= 22;

                if (match1 && match2 && match3 && match4 && match5) {
                    matches.push({ ch, badges: b });
                    console.log('MATCH FOUND:', ch, b);
                }
            }
        }
    }

    console.log('Total matches found:', matches.length, matches);
    fs.writeFileSync('tools/matches_399.json', JSON.stringify(matches, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
}
run();
