const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9230;

const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=C:/Users/user/AppData/Local/Temp/chrome_test_profile_' + Date.now(),
    'http://localhost:8080/index.html'
]);

function getJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function main() {
    let targets = null;
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 300));
        try {
            const list = await getJson(`http://127.0.0.1:${port}/json/list`);
            const page = list.find(t => t.type === 'page' && t.url.includes('index.html'));
            if (page && page.webSocketDebuggerUrl) {
                targets = page;
                break;
            }
        } catch (e) {}
    }
    const ws = new WebSocket(targets.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

    let msgId = 1;
    function sendCmd(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const listener = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.id === id) {
                    ws.removeEventListener('message', listener);
                    if (msg.error) reject(msg.error);
                    else resolve(msg.result);
                }
            };
            ws.addEventListener('message', listener);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await new Promise(r => setTimeout(r, 800));

    const evalRes = await sendCmd('Runtime.evaluate', {
        expression: `(() => {
            const chars = ['팧', '밯', '챟', '쌓', '땋'];
            const out = {};
            for (const c of chars) {
                Engine.loadText('대' + c);
                out[c] = Engine.strokes.slice(5).map((st, idx) => ({
                    badgeNum: idx + 6,
                    part: Engine.strokeMeta[idx + 5]?.part,
                    whId: Engine.jamoEntries[Engine.strokeMeta[idx + 5]?.ei]?.whId,
                    start: [Math.round((st[0][0] - 100)*10)/10, Math.round(st[0][1]*10)/10],
                    end: [Math.round((st[st.length-1][0] - 100)*10)/10, Math.round(st[st.length-1][1]*10)/10],
                    badge: [Math.round((Engine.badgePositions[idx + 5].bx - 100)*10)/10, Math.round(Engine.badgePositions[idx + 5].by*10)/10]
                }));
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(evalRes.result.value);
    for (const [c, list] of Object.entries(data)) {
        console.log(`\n=== Syllable: ${c} ===`);
        list.forEach(s => {
            console.log(`  Badge ${s.badgeNum} (${s.whId}): badge=(${s.badge}) start=(${s.start}) end=(${s.end})`);
        });
    }

    ws.close();
    chrome.kill();
    process.exit(0);
}

main();
