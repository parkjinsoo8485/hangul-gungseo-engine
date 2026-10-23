const http = require('http'), { spawn } = require('child_process');
const PORT = 9998;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT, 'about:blank'
], { stdio: 'ignore' });
const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TEST_SYLLABLES = [
    // 14 basic open syllables (ㅏ)
    '가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하',
    // 14 open syllables (ㅓ)
    '거', '너', '더', '러', '머', '버', '서', '어', '저', '처', '커', '터', '퍼', '허',
    // 14 open syllables (ㅗ)
    '고', '노', '도', '로', '모', '보', '소', '오', '조', '초', '코', '토', '포', '호',
    // 14 open syllables (ㅜ)
    '구', '누', '두', '루', '무', '부', '수', '우', '주', '추', '쿠', '투', '푸', '후',
    // 14 open syllables (ㅡ)
    '그', '느', '드', '르', '므', '브', '스', '으', '즈', '츠', '크', '트', '프', '흐',
    // 14 open syllables (ㅣ)
    '기', '니', '디', '리', '미', '비', '시', '이', '지', '치', '키', '티', '피', '히',
    // 14 open syllables (ㅐ)
    '개', '내', '대', '래', '매', '배', '새', '애', '재', '채', '캐', '태', '패', '해',
    // 14 open syllables (ㅔ)
    '게', '네', '데', '레', '메', '베', '세', '에', '제', '체', '케', '테', '페', '헤',
    // Compound vowel open syllables
    '과', '교', '구', '권', '귀', '규', '그', '의', '화', '회', '효', '후', '휘', '희',
    // Closed syllables with single batchims
    '각', '간', '갇', '갈', '감', '갑', '갓', '강', '갖', '갗', '갘', '같', '갚', '갛',
    '국', '군', '굳', '굴', '굼', '굽', '굿', '궁', '궂', '궃', '궄', '붙', '궆', '궇',
    '글', '금', '급', '긋', '긍', '닻', '댚', '랖', '뫃', '븟', '숮', '읓', '즠', '탚',
    // Compound vowels with batchims
    '관', '광', '괘', '괜', '굉', '권', '궐', '궤', '귀', '귓', '귐', '균', '귤',
    '확', '환', '활', '황', '횃', '횡', '훤', '훨', '훼', '휑', '휘', '휙', '흰',
    // Complex batchims
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
    ws.onmessage = m => { const j = JSON.parse(m.data); if (j.id && pend[j.id]) { pend[j.id](j); delete pend[j.id]; } };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async expr => {
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
        return r.result.result.value;
    };
    await send('Page.enable');
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    const results = await ev(`(() => {
        // Run full benchmark using our enhanced assimilation
        const words = ${JSON.stringify(TEST_SYLLABLES)};
        const issues = [];

        for (const w of words) {
            Engine.loadText(w);
            const g = Engine.glyphData;
            if (!g) { issues.push({ w, err: 'no glyphData' }); continue; }
            const W = g.W, H = g.H, N = g.idx.length;
            const sid = Int16Array.from(g.sid);
            const pid = Int16Array.from(g.pid);
            const K = Engine.strokes.length;

            const posToI = new Int32Array(W * H).fill(-1);
            for (let i = 0; i < N; i++) posToI[g.idx[i]] = i;

            const partOf = (s) => (Engine.strokeMeta && Engine.strokeMeta[s]) ? Engine.strokeMeta[s].part : 'single';

            for (let pass = 0; pass < 8; pass++) {
                const visited = new Uint8Array(N);
                const strokeIslands = Array.from({ length: K }, () => []);

                for (let i = 0; i < N; i++) {
                    if (visited[i]) continue;
                    const s = sid[i];
                    const comp = [i];
                    visited[i] = 1;
                    let head = 0;
                    while (head < comp.length) {
                        const cur = comp[head++];
                        const p = g.idx[cur];
                        const cx = p % W, cy = (p / W) | 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = cx + dx, ny = cy + dy;
                                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                                const j = posToI[ny * W + nx];
                                if (j >= 0 && !visited[j] && sid[j] === s) {
                                    visited[j] = 1;
                                    comp.push(j);
                                }
                            }
                        }
                    }
                    strokeIslands[s].push(comp);
                }

                let reassignedCount = 0;
                for (let k = 0; k < K; k++) {
                    const islands = strokeIslands[k];
                    if (islands.length <= 1) continue;
                    islands.sort((a, b) => b.length - a.length);

                    for (let islIdx = 1; islIdx < islands.length; islIdx++) {
                        const comp = islands[islIdx];
                        const ownPart = partOf(k);
                        const sameVotes = new Map(), anyVotes = new Map();
                        const ref = new Map();

                        comp.forEach(ci2 => {
                            const p = g.idx[ci2];
                            const cx = p % W, cy = (p / W) | 0;
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    if (dx === 0 && dy === 0) continue;
                                    const nx = cx + dx, ny = cy + dy;
                                    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                                    const j = posToI[ny * W + nx];
                                    if (j >= 0 && sid[j] !== k) {
                                        const nbS = sid[j];
                                        anyVotes.set(nbS, (anyVotes.get(nbS) || 0) + 1);
                                        if (partOf(nbS) === ownPart) sameVotes.set(nbS, (sameVotes.get(nbS) || 0) + 1);
                                        if (!ref.has(nbS)) ref.set(nbS, j);
                                    }
                                }
                            }
                        });

                        const targetVotes = sameVotes.size > 0 ? sameVotes : anyVotes;
                        let bestO = -1, bestV = -1;
                        if (targetVotes && targetVotes.size > 0) {
                            targetVotes.forEach((v, o) => { if (v > bestV) { bestV = v; bestO = o; } });
                        } else {
                            let cX = 0, cY = 0;
                            comp.forEach(ci2 => { const p = g.idx[ci2]; cX += p % W; cY += (p / W) | 0; });
                            cX /= comp.length; cY /= comp.length;
                            let minD = 1e9;
                            for (let candK = 0; candK < K; candK++) {
                                if (candK === k) continue;
                                if (partOf(candK) !== ownPart) continue;
                                const candPts = Engine.strokes[candK];
                                if (!candPts) continue;
                                candPts.forEach(pt => {
                                    const d = Math.hypot(cX - pt[0] * 3.6, cY - pt[1] * 3.6);
                                    if (d < minD) { minD = d; bestO = candK; }
                                });
                            }
                            if (bestO < 0) {
                                for (let candK = 0; candK < K; candK++) {
                                    if (candK === k) continue;
                                    const candPts = Engine.strokes[candK];
                                    if (!candPts) continue;
                                    candPts.forEach(pt => {
                                        const d = Math.hypot(cX - pt[0] * 3.6, cY - pt[1] * 3.6);
                                        if (d < minD) { minD = d; bestO = candK; }
                                    });
                                }
                            }
                        }

                        if (bestO >= 0) {
                            const pidRef = ref.has(bestO) ? pid[ref.get(bestO)] : 0;
                            comp.forEach(ci2 => { sid[ci2] = bestO; pid[ci2] = pidRef; });
                            reassignedCount += comp.length;
                        }
                    }
                }
                if (reassignedCount === 0) break;
            }

            // Verify
            const visitedFinal = new Uint8Array(N);
            const finalIslands = Array.from({ length: K }, () => 0);
            const finalCounts = Array.from({ length: K }, () => 0);
            for (let i = 0; i < N; i++) finalCounts[sid[i]]++;

            for (let i = 0; i < N; i++) {
                if (visitedFinal[i]) continue;
                const s = sid[i];
                finalIslands[s]++;
                const comp = [i];
                visitedFinal[i] = 1;
                let head = 0;
                while (head < comp.length) {
                    const cur = comp[head++];
                    const p = g.idx[cur];
                    const cx = p % W, cy = (p / W) | 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = cx + dx, ny = cy + dy;
                            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                            const j = posToI[ny * W + nx];
                            if (j >= 0 && !visitedFinal[j] && sid[j] === s) {
                                visitedFinal[j] = 1;
                                comp.push(j);
                            }
                        }
                    }
                }
            }

            const zeroStrokes = finalCounts.filter(c => c === 0).length;
            const splitStrokes = finalIslands.filter(cnt => cnt > 1).length;
            if (zeroStrokes > 0 || splitStrokes > 0) {
                issues.push({ w, zeroStrokes, splitStrokes, finalIslands, finalCounts });
            }
        }
        return { total: words.length, failures: issues.length, issues };
    })()`);

    console.log(JSON.stringify(results, null, 2));

    chrome.kill();
    process.exit(0);
})();
