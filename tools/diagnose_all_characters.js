const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9950;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--window-size=1600,1000',
    '--user-data-dir=' + process.env.TEMP + '/cdp_rec_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

    // Representative sample of syllables covering all 19 Chosungs, 21 Jungsungs, and major Jongsungs:
    const testSyllables = [
        // Vowel V (vertical): ㅏ, ㅓ, ㅕ, ㅑ, ㅣ, ㅐ, ㅔ, ㅒ, ㅖ
        '가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하',
        '거', '너', '더', '러', '머', '버', '서', '어', '저', '처', '커', '터', '퍼', '허',
        '개', '대', '배', '새', '애', '재', '해',
        '기', '니', '디', '리', '미', '비', '시', '이', '지', '치', '키', '티', '피', '히',
        '각', '난', '달', '맘', '밥', '상', '앙',
        '건', '덕', '벌', '섬', '엉', '정',
        // Vowel H (horizontal): ㅗ, ㅛ, ㅜ, ㅠ, ㅡ
        '고', '노', '도', '로', '모', '보', '소', '오', '조', '초', '코', '토', '포', '호',
        '구', '누', '두', '루', '무', '부', '수', '우', '주', '추', '쿠', '투', '푸', '후',
        '그', '느', '드', '르', '므', '브', '스', '으', '즈', '츠', '크', '트', '프', '흐',
        '교', '뇨', '료', '묘', '쇼', '요', '효',
        '규', '뉴', '류', '뮤', '슈', '유', '휴',
        '곡', '논', '돌', '몸', '봄', '송', '옹',
        '국', '눈', '둘', '물', '북', '술', '웅',
        '극', '는', '들', '름', '븝', '승', '응',
        // Vowel C (complex / compound): ㅘ, ㅙ, ㅚ, ㅝ, ㅞ, ㅟ, ㅢ
        '과', '놔', '봐', '좌', '화',
        '곽', '관', '광',
        '괘', '돼', '쇄', '왜',
        '괴', '뇌', '되', '뢰', '뫼', '뵈', '쇠', '외', '죄', '최', '회',
        '획', '굉',
        '궈', '눠', '둬', '뤄', '뭐', '숴', '워', '줘',
        '권', '궐', '웜',
        '웨', '궤', '훼',
        '귀', '뉘', '뒤', '뤼', '뷔', '쉬', '위', '쥐', '취', '휘',
        '의', '희', '늬'
    ];

    console.log(`Starting survey on ${testSyllables.length} representative syllables...`);

    const results = await ev(`(async () => {
        const chk = document.getElementById('chk-glyph');
        if (chk) chk.checked = true;

        const syllables = ${JSON.stringify(testSyllables)};
        const reports = [];

        for (const char of syllables) {
            Engine.loadText(char);
            Engine.stopDemo();

            const g = Engine.glyphData;
            if (!g) {
                reports.push({ char, error: 'no_glyph_data' });
                continue;
            }

            const numStrokes = Engine.strokes.length;
            const strokeStats = [];

            // 1. Analyze each stroke's properties
            for (let s = 0; s < numStrokes; s++) {
                const pts = Engine.strokes[s];
                const meta = Engine.strokeMeta[s];
                const p0 = pts[0];
                const pLast = pts[pts.length - 1];
                const dx = pLast[0] - p0[0];
                const dy = pLast[1] - p0[1];

                // Physical arc length
                let arcLen = 0;
                for (let k = 1; k < pts.length; k++) {
                    arcLen += Math.hypot(pts[k][0] - pts[k-1][0], pts[k][1] - pts[k-1][1]);
                }

                // Check pixel count and pixel spatial distribution
                let pixCount = 0;
                let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
                const pixXList = [], pixYList = [];
                for (let i = 0; i < g.idx.length; i++) {
                    const st = (g.key[i] / 4096) | 0;
                    if (st === s) {
                        pixCount++;
                        const p = g.idx[i];
                        const x = p % g.W, y = (p / g.W) | 0;
                        if (x < minX) minX = x; if (x > maxX) maxX = x;
                        if (y < minY) minY = y; if (y > maxY) maxY = y;
                        pixXList.push(x); pixYList.push(y);
                    }
                }

                // Disconnected islands count (detect if stroke is fragmented into multiple pieces)
                let islands = 0;
                if (pixCount > 0) {
                    const visited = new Uint8Array(pixCount);
                    for (let i = 0; i < pixCount; i++) {
                        if (visited[i]) continue;
                        islands++;
                        const q = [i];
                        visited[i] = 1;
                        for (let h = 0; h < q.length; h++) {
                            const cur = q[h];
                            const cx = pixXList[cur], cy = pixYList[cur];
                            for (let j = 0; j < pixCount; j++) {
                                if (!visited[j] && Math.abs(pixXList[j] - cx) <= 2 && Math.abs(pixYList[j] - cy) <= 2) {
                                    visited[j] = 1;
                                    q.push(j);
                                }
                            }
                        }
                    }
                }

                // Check if stroke direction is reversed
                let dirAnomaly = null;
                const strokeType = pts[0][4]; // 'H', 'V', 'O', etc.
                if (strokeType === 'H' && dx < -5) dirAnomaly = 'Horizontal stroke drawn Right-to-Left';
                if (strokeType === 'V' && dy < -5) dirAnomaly = 'Vertical stroke drawn Bottom-to-Top';

                strokeStats.push({
                    s,
                    part: meta.part,
                    subPart: meta.subPart,
                    strokeType,
                    ptsLen: pts.length,
                    arcLen: Math.round(arcLen * 10) / 10,
                    pixCount,
                    islands,
                    dirAnomaly,
                    p0: [Math.round(p0[0]*10)/10, Math.round(p0[1]*10)/10],
                    pLast: [Math.round(pLast[0]*10)/10, Math.round(pLast[1]*10)/10],
                    span: { w: maxX - minX, h: maxY - minY }
                });
            }

            // 2. Check for intermediate incomplete stroke reveals
            // i.e., when stroke s is revealed, does it leave previous strokes unfinished?
            // or does stroke s steal pixels that belong spatially to stroke s-1?
            const issues = [];
            for (let s = 0; s < numStrokes; s++) {
                const st = strokeStats[s];
                if (st.pixCount === 0) {
                    issues.push(\`Stroke \${s} (\${st.part}) has 0 pixels!\`);
                }
                if (st.islands > 1) {
                    issues.push(\`Stroke \${s} (\${st.part}) is split into \${st.islands} disconnected islands!\`);
                }
                if (st.dirAnomaly) {
                    issues.push(\`Stroke \${s} (\${st.part}): \${st.dirAnomaly}\`);
                }
                // Check pts density anomaly
                if (st.ptsLen > 250) {
                    issues.push(\`Stroke \${s} (\${st.part}) point count is excessively high (\${st.ptsLen} pts)\`);
                }
            }

            reports.push({
                char,
                numStrokes,
                issues,
                strokeStats
            });
        }
        return reports;
    })()`);

    fs.writeFileSync('C:/Users/user/.gemini/antigravity/brain/9a1def4d-17fd-4c3a-ba0b-080870cccc5e/survey_all_characters.json', JSON.stringify(results, null, 2));
    console.log(`Survey complete. Wrote ${results.length} reports to survey_all_characters.json`);

    ws.close();
    chrome.kill();
    process.exit(0);
})().catch(e => {
    console.error(e);
    chrome.kill();
    process.exit(1);
});
