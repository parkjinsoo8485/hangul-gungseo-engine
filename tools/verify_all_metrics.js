const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9949;
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

const TEST_SYLLABLES = [
    // Basic Cho + Jung
    '가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하',
    '거', '너', '더', '러', '머', '버', '서', '어', '저', '처', '커', '터', '퍼', '허',
    '고', '노', '도', '로', '모', '보', '소', '오', '조', '초', '코', '토', '포', '호',
    '구', '누', '두', '루', '무', '부', '수', '우', '주', '추', '쿠', '투', '푸', '후',
    '그', '느', '드', '르', '므', '브', '스', '으', '즈', '츠', '크', '트', '프', '흐',
    '기', '니', '디', '리', '미', '비', '시', '이', '지', '치', '키', '티', '피', '히',
    '개', '내', '대', '래', '매', '배', '새', '애', '재', '채', '캐', '태', '패', '해',
    '게', '네', '데', '레', '메', '베', '세', '에', '제', '체', '케', '테', '페', '헤',
    // Compound vowels
    '과', '곽', '관', '괄', '광', '괘', '괜', '괴', '괵', '굉', '교', '구', '권', '궐', '궤', '귀',
    '화', '확', '환', '활', '황', '홰', '횃', '회', '획', '횡', '효', '후', '훤', '훨', '훼', '휘',
    '좌', '죄', '줘', '쥐', '췌', '취', '퇴', '회', '훼', '휘', '희', '흰', '의',
    // Complex consonants & double batchim
    '값', '닭', '흙', '밝', '맑', '앉', '얹', '넓', '얇', '끊', '닳', '잃', '읊', '훑', '싫',
    '깎', '꺾', '낚', '섞', '묶', '볶', '있', '없', '었', '겠', '됐', '봤',
    // Key calligraphy test words
    '국어', '한글', '조형', '완성', '획순', '시범', '쓰기', '훈민', '정음', '궁서'
];

(async () => {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list.length) break; } catch (e) { }
        await sleep(250);
    }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 0; const pend = {};
    ws.onmessage = m => {
        const j = JSON.parse(m.data);
        if (j.id && pend[j.id]) { pend[j.id](j); delete pend[j.id]; }
    };
    const send = (method, params = {}) => new Promise(r => {
        const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params }));
    });
    const ev = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    };
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const results = await ev(`(async () => {
        const words = ${JSON.stringify(TEST_SYLLABLES)};
        const out = [];

        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;

        for (const w of words) {
            Engine.loadText(w);
            const g = Engine.glyphData;
            const K = Engine.strokes.length;
            if (!g || !g.idx || g.idx.length === 0) {
                out.push({ word: w, error: 'No glyph data' });
                continue;
            }

            const totalPixels = g.idx.length;
            const strokeCounts = {};
            for (let k = 0; k < K; k++) strokeCounts[k] = 0;

            const W = g.W;
            const strokePixels = {};
            for (let k = 0; k < K; k++) strokePixels[k] = [];

            for (let i = 0; i < totalPixels; i++) {
                const s = g.sid[i];
                const p = g.pid[i];
                if (strokeCounts[s] !== undefined) strokeCounts[s]++;
                const idx = g.idx[i];
                const px = idx % W;
                const py = Math.floor(idx / W);
                if (strokePixels[s]) strokePixels[s].push({ x: px, y: py, p });
            }

            // Zero-pixel strokes
            let zeroStrokes = 0;
            for (let k = 0; k < K; k++) {
                if (!strokeCounts[k] || strokeCounts[k] === 0) zeroStrokes++;
            }

            // Split strokes check
            let splitStrokes = 0;
            for (let k = 0; k < K; k++) {
                const pxs = strokePixels[k];
                if (!pxs || pxs.length === 0) continue;

                const pset = new Set(pxs.map(pt => pt.x + ',' + pt.y));
                const visited = new Set();
                let comps = 0;

                for (const pt of pxs) {
                    const key = pt.x + ',' + pt.y;
                    if (visited.has(key)) continue;
                    comps++;
                    const q = [pt];
                    visited.add(key);
                    while (q.length > 0) {
                        const curr = q.pop();
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (dx === 0 && dy === 0) continue;
                                const nk = (curr.x + dx) + ',' + (curr.y + dy);
                                if (pset.has(nk) && !visited.has(nk)) {
                                    visited.add(nk);
                                    q.push({ x: curr.x + dx, y: curr.y + dy });
                                }
                            }
                        }
                    }
                }
                // If disconnected
                if (comps > 1) {
                    splitStrokes++;
                }
            }

            out.push({
                word: w,
                strokes: K,
                totalPixels,
                zeroStrokes,
                splitStrokes
            });
        }
        return out;
    })()`);

    let totalTested = results.length;
    let anyZero = 0, anySplit = 0;
    const failures = [];

    for (const r of results) {
        if (r.error) {
            failures.push(r.word + ': ' + r.error);
            continue;
        }
        if (r.zeroStrokes > 0) {
            anyZero += r.zeroStrokes;
            failures.push(r.word + ': zero-pixel stroke count ' + r.zeroStrokes);
        }
        if (r.splitStrokes > 0) {
            anySplit += r.splitStrokes;
            failures.push(r.word + ': split strokes count ' + r.splitStrokes);
        }
    }

    console.log('Tested ' + totalTested + ' syllables/words.');
    console.log('Zero pixel occurrences: ' + anyZero);
    console.log('Split stroke occurrences: ' + anySplit);
    if (failures.length > 0) {
        console.log('Detailed Failures (' + failures.length + '):');
        failures.forEach(f => console.log('  - ' + f));
    } else {
        console.log('ALL TESTS PASSED! 100% PERFECT VERIFICATION!');
    }

    ws.close();
    chrome.kill();
    process.exit(failures.length > 0 ? 1 : 0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
