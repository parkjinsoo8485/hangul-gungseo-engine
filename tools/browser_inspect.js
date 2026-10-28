const { spawn } = require('child_process');
const http = require('http');

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9229;

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
    if (!targets) {
        console.error('Could not connect to Chrome');
        chrome.kill();
        process.exit(1);
    }

    const ws = new WebSocket(targets.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });

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

    // Wait for page to finish initializing
    await new Promise(r => setTimeout(r, 1000));

    // Evaluate preset words and check strokes & badges in REAL browser!
    const evalRes = await sendCmd('Runtime.evaluate', {
        expression: `(() => {
            const words = ['한글', '궁서체', '서예', '대한민국', '꽃길', '아름다운', '훈민정음', '증발', '산출', '용접', '직접'];
            const out = {};
            for (const w of words) {
                Engine.loadText(w);
                out[w] = {
                    totalStrokes: Engine.strokes.length,
                    strokes: Engine.strokes.map((st, i) => ({
                        idx: i + 1,
                        ci: Engine.strokeMeta[i]?.ci,
                        part: Engine.strokeMeta[i]?.part,
                        whId: Engine.jamoEntries[Engine.strokeMeta[i]?.ei]?.whId,
                        start: [Math.round(st[0][0]*10)/10, Math.round(st[0][1]*10)/10],
                        end: [Math.round(st[st.length-1][0]*10)/10, Math.round(st[st.length-1][1]*10)/10],
                        badge: Engine.badgePositions[i] ? [Math.round(Engine.badgePositions[i].bx*10)/10, Math.round(Engine.badgePositions[i].by*10)/10] : null
                    }))
                };
            }
            return JSON.stringify(out);
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(evalRes.result.value);
    for (const [w, info] of Object.entries(data)) {
        console.log(`\n=== Word: ${w} (Total: ${info.totalStrokes} strokes) ===`);
        info.strokes.forEach(s => {
            console.log(`  #${s.idx} [ci=${s.ci} ${s.part} ${s.whId}]: start=(${s.start}) end=(${s.end}) badge=(${s.badge})`);
        });
    }

    ws.close();
    chrome.kill();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    chrome.kill();
    process.exit(1);
});
