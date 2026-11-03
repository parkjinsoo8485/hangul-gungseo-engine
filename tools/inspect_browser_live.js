const http = require('http');

const PORT = 9222;

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    let list;
    for (let i = 0; i < 20; i++) {
        try {
            list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list'));
            if (list && list.length) break;
        } catch (e) {}
        await sleep(300);
    }
    if (!list || !list.length) {
        console.error('Cannot connect to Chrome on port ' + PORT);
        process.exit(1);
    }

    const page = list.find(t => t.type === 'page' && t.url.includes('localhost:8080')) || list.find(t => t.type === 'page');
    console.log('Target Page:', page.title, page.url);

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let reqId = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
        const id = reqId++;
        const onMsg = ({ data }) => {
            const res = JSON.parse(data);
            if (res.id === id) {
                ws.removeEventListener('message', onMsg);
                if (res.error) reject(res.error);
                else resolve(res.result);
            }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id, method, params }));
    });

    await new Promise(r => ws.onopen = r);

    // Listen to Console messages
    ws.addEventListener('message', ({ data }) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Console.messageAdded') {
            console.log('[BROWSER CONSOLE]', msg.params.message.level, msg.params.message.text);
        }
        if (msg.method === 'Runtime.consoleAPICalled') {
            console.log('[BROWSER LOG]', msg.params.type, msg.params.args.map(a => a.value || a.description).join(' '));
        }
        if (msg.method === 'Runtime.exceptionThrown') {
            console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
        }
    });

    await send('Console.enable');
    await send('Runtime.enable');

    // Check current Engine state
    const evalRes = await send('Runtime.evaluate', {
        expression: `(() => {
            return {
                title: document.title,
                textVal: document.getElementById('text-input')?.value,
                strokesCount: Engine?.strokes?.length,
                badgeCount: Engine?.badgePositions?.length,
                strokeStartInfos: Engine?.strokeStartInfos?.length,
                currentStroke: Engine?.currentStroke,
                hasWH: !!window.WH,
                whReady: window.WH?.ready?.(),
                whVersion: window.WH?.version
            };
        })()`,
        returnByValue: true
    });

    console.log('Browser State:', evalRes.result.value);

    // Now test words that the user might have checked:
    // e.g. '월', '활', '물', 'ㄱ', 'ㄹ', '가'
    const testWords = ['월', '활', '물', '가', 'ㄱ', 'ㄹ'];
    for (const w of testWords) {
        const r = await send('Runtime.evaluate', {
            expression: `(() => {
                Engine.loadText('${w}');
                const badges = Engine.badgePositions || [];
                const strokes = Engine.strokes || [];
                const meta = Engine.strokeMeta || [];
                return {
                    char: '${w}',
                    strokes: strokes.length,
                    badges: badges.map((b, i) => ({ i: i + 1, bx: Math.round(b.bx), by: Math.round(b.by), part: meta[i]?.part })),
                    metaParts: meta.map(m => m.part + '/' + m.subPart)
                };
            })()`,
            returnByValue: true
        });
        console.log(`\nWord [${w}]:`, JSON.stringify(r.result.value));
    }

    ws.close();
})();
