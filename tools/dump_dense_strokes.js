const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_dense_' + PORT, 'about:blank'
], { stdio: 'ignore' });
const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    let list;
    for (let i = 0; i < 40; i++) { try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { } await sleep(250); }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); res(r.result); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2000);

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            document.getElementById('char-input').value = '획순';
            Engine.loadText('획순');
            Engine.stopDemo();
            Engine.currentStroke = Engine.strokes.length;
            Engine.currentStep = 9999;
            Engine.renderGlyphInk();
            Engine.renderScene();

            return Engine.strokes.map((st, i) => ({
                strokeIdx: i + 1,
                char: i < 7 ? '획' : '순',
                name: [
                    'ㅎ 꼭지 (첫 획)', 'ㅎ 가로획', 'ㅎ 이응(ㅇ)', 'ㅗ 세로 꼭지', 'ㅗ 가로획', 'ㅣ 세로 기둥', 'ㄱ 받침',
                    'ㅅ 좌측 삐침', 'ㅅ 우측 파임', 'ㅜ 가로획', 'ㅜ 세로 기둥', 'ㄴ 받침'
                ][i],
                points: st.map(p => [+p[0].toFixed(2), +p[1].toFixed(2)])
            }));
        })()`,
        returnByValue: true
    });

    fs.writeFileSync('tools/dense_strokes_12.json', JSON.stringify(res.result.value, null, 2));
    console.log('Saved tools/dense_strokes_12.json');
    ws.close(); chrome.kill(); process.exit(0);
})();
