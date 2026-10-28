const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9983;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--window-size=1280,900',
    '--user-data-dir=' + process.env.TEMP + '/cdp_arch_' + PORT, 'about:blank'
], { stdio: 'ignore' });
const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ARCHETYPES = [
    // 1. 복합모음 ㅗ 계열 (무받침 & 받침)
    '화', '과', '왜', '외', '획', '광', '관', '괄', '황', '횡',
    // 2. 복합모음 ㅜ 계열 (무받침 & 받침)
    '워', '웨', '위', '원', '월', '윈', '권', '궐', '뭘', '휭',
    // 3. 복합모음 ㅡ 계열
    '의', '희', '흰', '늴', '띔',
    // 4. 가로모음 ㅜ/ㅠ 계열 (받침 유무)
    '구', '누', '두', '루', '무', '부', '수', '우', '주', '추', '쿠', '투', '푸', '후',
    '국', '눈', '둠', '물', '불', '순', '줄', '출', '풀', '훈', '류', '륜', '률', '륨',
    // 5. 가로모음 ㅗ/ㅛ 계열
    '고', '노', '도', '로', '모', '보', '소', '오', '조', '초', '코', '토', '포', '호',
    '곰', '논', '돌', '롬', '봄', '송', '온', '종', '총', '콩', '통', '폭', '홍', '료',
    // 6. 가로모음 ㅡ 계열
    '그', '느', '드', '르', '므', '브', '스', '으', '즉', '크', '트', '프', '흐',
    '글', '늑', '들', '름', '믄', '블', '슥', '은', '즐', '큭', '틀', '픈', '흙',
    // 7. 세로모음 좌돌기 ㅓ/ㅕ/ㅔ/ㅖ 계열 (초성과의 간격)
    '거', '너', '더', '러', '머', '버', '서', '어', '저', '처', '커', '터', '퍼', '허',
    '격', '넌', '덜', '럼', '법', '성', '엉', '정', '척', '컴', '털', '펑', '험',
    '개', '내', '대', '래', '매', '배', '새', '애', '재', '채', '캐', '태', '패', '해',
    '객', '낸', '댁', '램', '맵', '백', '색', '앤', '쟁', '책', '캠', '택', '팩', '핵',
    '계', '례', '몌', '폐', '혜',
    // 8. 겹받침 11종 대표 글자
    '넋', '삯', '몫', '낚', '앉', '얹', '않', '끊', '괜',
    '닭', '맑', '붉', '흙', '읽', '삶', '젊', '닮', '굶',
    '엷', '넓', '짧', '밟', '곬', '돐', '핥', '훑', '읊', '잃', '곯', '뚫', '값', '없',
    // 9. 쌍초성 5종 대표 글자
    '까', '깎', '꺾', '꼬', '꼭', '꽃', '꾸', '꾹', '꿈', '끄', '끝', '깨', '꾀',
    '따', '딱', '땅', '또', '똑', '똥', '뚜', '뚝', '뚱', '뜨', '뜻', '때', '뙈',
    '빠', '빡', '빵', '뽀', '뽑', '뽕', '뿌', '뿍', '뿜', '쁘', '쁜', '빼', '뾰',
    '싸', '싹', '쌍', '쏘', '쏙', '쏙', '쑤', '쑥', '쑴', '쓰', '쓱', '쌔', '쐐',
    '짜', '짝', '짱', '쪼', '쪽', '쫑', '쭈', '쭉', '쭘', '쯔', '쯤', '째', '쬐'
];

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
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    await sleep(2500);

    console.log(`Starting Archetype Deep Audit for ${ARCHETYPES.length} structural classes...`);
    const results = [];

    for (let i = 0; i < ARCHETYPES.length; i++) {
        const char = ARCHETYPES[i];
        const res = await send('Runtime.evaluate', {
            expression: `(() => {
                Engine.loadText('${char}');
                const g = Engine.glyphData;
                const strokes = Engine.strokes;
                const entries = Engine.jamoEntries;
                const jb = Engine.jamoEntries[0] ? Engine.jamoEntries[0] : null;

                // 1. Centerline ink coverage for each stroke
                const strokeStats = strokes.map((pts, sIdx) => {
                    let onInk = 0;
                    const R = g.R;
                    pts.forEach(p => {
                        const x = Math.round(p[0] * R / 100);
                        const y = Math.round(p[1] * R / 100);
                        if (x >= 0 && x < g.W && y >= 0 && y < g.H) {
                            // check if alpha > 40
                            // In glyphData, we can check if any pixel near (x, y) has alpha
                            onInk++;
                        }
                    });
                    const len = pts.length;
                    return { sIdx, len };
                });

                // 2. Pixel partition analysis per stroke
                const sCounts = new Int32Array(strokes.length);
                const sMinX = new Int32Array(strokes.length).fill(999);
                const sMaxX = new Int32Array(strokes.length).fill(-1);
                const sMinY = new Int32Array(strokes.length).fill(999);
                const sMaxY = new Int32Array(strokes.length).fill(-1);

                for (let idx = 0; idx < g.idx.length; idx++) {
                    const sid = g.sid[idx];
                    if (sid >= 0 && sid < strokes.length) {
                        sCounts[sid]++;
                        const x = g.idx[idx] % g.W;
                        const y = Math.floor(g.idx[idx] / g.W);
                        if (x < sMinX[sid]) sMinX[sid] = x;
                        if (x > sMaxX[sid]) sMaxX[sid] = x;
                        if (y < sMinY[sid]) sMinY[sid] = y;
                        if (y > sMaxY[sid]) sMaxY[sid] = y;
                    }
                }

                // Check for anomalies:
                // a) Any stroke with 0 pixels
                const zeroPixelStrokes = [];
                for (let s = 0; s < strokes.length; s++) {
                    if (sCounts[s] === 0) zeroPixelStrokes.push(s);
                }

                // b) In C-type vowels, does jung_h reach near stemX_C?
                let jungHReachIssue = false;
                const isC = entries.some(e => e.vType === 'C');
                if (isC) {
                    const jungHEntry = entries.find(e => e.subPart === 'jung_h');
                    const jungVEntry = entries.find(e => e.subPart === 'jung_v');
                    if (jungHEntry && jungVEntry && jungHEntry.fbox && jungVEntry.fbox) {
                        const hRight = jungHEntry.fbox[0] + jungHEntry.fbox[2];
                        const vLeft = jungVEntry.fbox[0];
                        if (hRight < vLeft - 2.0) {
                            jungHReachIssue = true;
                        }
                    }
                }

                // c) In H-type vowels with batchim, does jung_v reach near jongY1?
                let uStemTruncated = false;
                const isU = entries.some(e => (e.whId || '').includes('ㅜ') || (e.whId || '').includes('ㅠ'));
                const hasJong = entries.some(e => e.part === 'jong');
                if (isU && hasJong) {
                    // Check stroke corresponding to the stem: should not stop in whitespace while ink continues
                    const uStemStroke = strokes.find(st => {
                        const startY = st[0][1];
                        const dx = Math.abs(st[st.length - 1][0] - st[0][0]);
                        const dy = st[st.length - 1][1] - st[0][1];
                        return startY > 45 && dy > 8 && dx < 6;
                    });
                    if (uStemStroke) {
                        const lastX = Math.round(uStemStroke[uStemStroke.length - 1][0] * g.R / 100);
                        const lastY = Math.round(uStemStroke[uStemStroke.length - 1][1] * g.R / 100);
                        // Check if ink continues more than 20px below lastY in the same column
                        let inkContinuesBelow = false;
                        for (let y = lastY + 12; y <= lastY + 30 && y < g.H; y++) {
                            for (let dx = -3; dx <= 3; dx++) {
                                const p = y * g.W + lastX + dx;
                                // If this pixel has alpha in the font and belongs to jung
                                for (let i = 0; i < g.idx.length; i++) {
                                    if (g.idx[i] === p && g.sid[i] === uStemStroke.sIdx) {
                                        inkContinuesBelow = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (inkContinuesBelow) {
                            uStemTruncated = true;
                        }
                    }
                }

                return {
                    char: '${char}',
                    strokesCount: strokes.length,
                    totalPixels: g.idx.length,
                    zeroPixelStrokes,
                    jungHReachIssue,
                    uStemTruncated
                };
            })()`,
            returnByValue: true
        });

        const v = res.result.value;
        results.push(v);
        if (v.zeroPixelStrokes.length > 0 || v.jungHReachIssue || v.uStemTruncated) {
            console.log(`[ISSUE FOUND] '${v.char}': zeroPx=[${v.zeroPixelStrokes}], jungHReach=${v.jungHReachIssue}, uStemTrunc=${v.uStemTruncated}`);
        }
    }

    const issues = results.filter(r => r.zeroPixelStrokes.length > 0 || r.jungHReachIssue || r.uStemTruncated);
    console.log(`\nArchetype Audit Complete! Total checked: ${results.length}, Issues found: ${issues.length}`);

    fs.writeFileSync('C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/archetype_audit_results.json', JSON.stringify(results, null, 2));

    ws.close(); chrome.kill(); process.exit(0);
})();
