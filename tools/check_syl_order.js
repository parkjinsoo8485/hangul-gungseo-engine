const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const PORT = 9994;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT, '--window-size=1280,900', '--user-data-dir=' + path.join(process.env.TEMP, 'probe_syl_order_' + Date.now()), 'about:blank'], { stdio: 'ignore' });
const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    let list;
    for (let i = 0; i < 40; i++) { try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) {} await sleep(100); }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1; const pend = {};
    ws.onmessage = m => { const j = JSON.parse(m.data); if (j.id && pend[j.id]) { pend[j.id](j); delete pend[j.id]; } };
    const send = (m, p = {}) => new Promise((res, rej) => { const i = id++; pend[i] = r => (r.error ? rej(r.error) : res(r)); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
    const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1500);

    const testSyls = ['홰', '닭', '값', '넓', '꽃', '의', '월', '앉', '하'];
    const results = {};
    for (const syl of testSyls) {
        const data = await ev(`(() => {
            Engine.loadText("${syl}");
            return Engine.strokes.map((st, i) => {
                const meta = Engine.strokeMeta && Engine.strokeMeta[i];
                return {
                    i: i + 1,
                    part: meta ? meta.part : '?',
                    sub: meta ? meta.subPart : '?',
                    whId: meta ? meta.whId : '?',
                    start: [+st[0][0].toFixed(1), +st[0][1].toFixed(1)],
                    end: [+st[st.length - 1][0].toFixed(1), +st[st.length - 1][1].toFixed(1)]
                };
            });
        })()`);
        results[syl] = data;
    }
    console.log(JSON.stringify(results, null, 2));
    ws.close(); chrome.kill();
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
