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

    // Test a wide variety of representative syllables
    const sampleWords = [
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
        '훈민정음', '궁서체', '획순', '조형미'
    ];

    console.log(`Checking ${sampleWords.length} words for centerline ink-coverage (centerline points in white space)...`);

    const issues = [];

    for (const w of sampleWords) {
        const res = await evalJs(`
            (function() {
                Engine.loadText('${w}');
                const g = Engine.glyphData;
                const strokes = Engine.strokes;
                const R = g.R;
                
                // Render pure glyph ink onto offscreen canvas
                const cv = document.createElement('canvas');
                cv.width = R * Engine.charCount;
                cv.height = R;
                const ctx = cv.getContext('2d');
                ctx.fillStyle = '#000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'normal ' + Math.round(R * 0.81) + 'px "궁서", "Gungsuh", serif';
                for (let ci = 0; ci < Engine.charCount; ci++) {
                    ctx.fillText(Engine.charsInfo[ci].char, ci * R + R / 2, R / 2);
                }
                const img = ctx.getImageData(0, 0, cv.width, R).data;

                // Function to check if a point [x, y] in canvas 0..100 coords has ink
                function hasInk(cx, cy, radius = 4) {
                    const px = Math.round(cx * R / 100);
                    const py = Math.round(cy * R / 100);
                    // Check neighborhood within radius
                    for (let dy = -radius; dy <= radius; dy++) {
                        for (let dx = -radius; dx <= radius; dx++) {
                            const x = px + dx, y = py + dy;
                            if (x >= 0 && x < cv.width && y >= 0 && y < R) {
                                if (img[(y * cv.width + x) * 4 + 3] > 80) return true;
                            }
                        }
                    }
                    return false;
                }

                // Check every stroke: what fraction of its points are on ink?
                const strokeReports = [];
                strokes.forEach((pts, sIdx) => {
                    let onInk = 0;
                    pts.forEach(p => {
                        if (hasInk(p[0], p[1], 4)) onInk++;
                    });
                    const ratio = onInk / pts.length;
                    strokeReports.push({ sIdx, ratio, totalPts: pts.length, onInk });
                });

                return {
                    charCount: Engine.charCount,
                    strokeReports
                };
            })()
        `);

        res.strokeReports.forEach(sr => {
            if (sr.ratio < 0.65) {
                issues.push(`Word "${w}" Stroke ${sr.sIdx + 1}: only ${(sr.ratio*100).toFixed(1)}% of centerline points on ink! (${sr.onInk}/${sr.totalPts})`);
            }
        });
    }

    console.log(`\n=== INK COVERAGE AUDIT RESULTS ===`);
    console.log(`Total words tested: ${sampleWords.length}`);
    console.log(`Issues found (<65% ink coverage): ${issues.length}`);
    issues.forEach(iss => console.log(' ⚠️ ' + iss));

    chrome.kill();
    process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
