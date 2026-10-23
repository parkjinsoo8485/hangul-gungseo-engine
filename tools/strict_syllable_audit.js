const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9951;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
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
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(1500);

    const evalJs = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        return r.result.value;
    };

    // Test individual syllables
    const syllables = [
        '가', '각', '간', '갈', '감', '갑', '갓', '강', '갖', '갗', '같', '갚', '갛',
        '고', '곡', '곤', '골', '곰', '곱', '곳', '공', '곶', '꽃',
        '구', '국', '군', '굴', '궁', '규', '균', '귤', '흉', '휴',
        '그', '극', '근', '글', '금', '급', '긋', '긍',
        '기', '길', '김', '깃', '깅',
        '과', '곽', '관', '광', '괘', '괜', '괴', '괵', '굉',
        '권', '궐', '궤', '귀', '귓',
        '의', '희', '흰',
        '나', '너', '노', '누', '느', '니',
        '다', '더', '도', '두', '드', '디',
        '라', '러', '로', '루', '르', '리',
        '마', '머', '모', '무', '므', '미',
        '바', '버', '보', '부', '브', '비',
        '사', '서', '소', '수', '스', '시',
        '아', '어', '오', '우', '으', '이',
        '자', '저', '조', '주', '즈', '지',
        '차', '처', '초', '추', '츠', '치',
        '카', '커', '코', '쿠', '크', '키',
        '타', '터', '토', '투', '트', '티',
        '파', '퍼', '포', '푸', '프', '피',
        '하', '허', '호', '후', '흐', '히',
        '훈', '민', '정', '음'
    ];

    console.log(`Auditing ${syllables.length} individual syllables with engine internal ink data...`);
    const issues = [];

    for (const s of syllables) {
        const res = await evalJs(`
            (function() {
                Engine.loadText('${s}');
                const g = Engine.glyphData;
                const strokes = Engine.strokes;
                const R = g.R;
                
                // Build ink grid from g.idx
                const inkGrid = new Uint8Array(g.W * g.H);
                for (let i = 0; i < g.idx.length; i++) {
                    inkGrid[g.idx[i]] = 1;
                }

                // Check each stroke: how many points are on ink (within radius 4px)
                const sReps = [];
                strokes.forEach((pts, sIdx) => {
                    let onInk = 0;
                    pts.forEach(p => {
                        const px = Math.round(p[0] * R / 100);
                        const py = Math.round(p[1] * R / 100);
                        let hit = false;
                        for (let dy = -5; dy <= 5 && !hit; dy++) {
                            for (let dx = -5; dx <= 5 && !hit; dx++) {
                                const x = px + dx, y = py + dy;
                                if (x >= 0 && x < g.W && y >= 0 && y < g.H) {
                                    if (inkGrid[y * g.W + x]) hit = true;
                                }
                            }
                        }
                        if (hit) onInk++;
                    });
                    sReps.push({ sIdx, ratio: onInk / pts.length, total: pts.length, onInk });
                });
                return sReps;
            })()
        `);

        res.forEach(r => {
            if (r.ratio < 0.70) {
                issues.push(`Syllable "${s}" Stroke ${r.sIdx + 1}: only ${(r.ratio*100).toFixed(1)}% points on ink (${r.onInk}/${r.total})`);
            }
        });
    }

    console.log(`\n=== STRICT INK COVERAGE AUDIT RESULTS ===`);
    console.log(`Total syllables tested: ${syllables.length}`);
    console.log(`Issues found (<70% on ink): ${issues.length}`);
    issues.forEach(iss => console.log(' ⚠️ ' + iss));

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
