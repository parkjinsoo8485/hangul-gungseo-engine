const http = require('http');
const PORT = 9998;
const fs = require('fs');
const { spawn } = require('child_process');
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_search_' + PORT,
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

    // Test all Cho 'ㄹ' and 'ㅌ' with compound vowels
    const testChars = [
        '릐', '틔', '릘', '릑', '릔', '릠', '릡', '릣', '릤', '릥',
        '틘', '틠', '틡', '틣', '틥',
        '뢰', '뢔', '뤈', '뤠', '뤼', '롸',
        '퇴', '퇘', '퉈', '퉤', '튀', '톼',
        '듸', '띱', '띄', '뙤', '뛔'
    ];

    console.log('Testing', testChars.length, 'characters...');
    for (const c of testChars) {
        const data = await evalJs(`(() => {
            Engine.loadText('${c}');
            const strokes = Engine.strokes;
            const meta = Engine.strokeMeta;
            return {
                char: '${c}',
                strokesCount: strokes.length,
                badges: (Engine.badgePositions || []).map(b => ({
                    bx: Math.round(b.bx * 10) / 10,
                    by: Math.round(b.by * 10) / 10
                })),
                strokeFirstLast: strokes.map((s, idx) => ({
                    idx,
                    p0: [Math.round(s[0][0]*10)/10, Math.round(s[0][1]*10)/10],
                    pEnd: [Math.round(s[s.length-1][0]*10)/10, Math.round(s[s.length-1][1]*10)/10]
                }))
            };
        })()`);

        // Check if any stroke crosses horizontally from x < 35 to x > 60 in y < 45
        const weirdH = data.strokeFirstLast.filter(s => s.p0[0] < 35 && s.pEnd[0] > 60 && s.p0[1] < 45);
        if (weirdH.length > 0) {
            console.log('FOUND WEIRD HORIZONTAL STROKE in', c, ':', weirdH);
        }
    }

    ws.close(); chrome.kill(); process.exit(0);
}
run();
