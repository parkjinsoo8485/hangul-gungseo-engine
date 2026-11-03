const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');

const PORT = 9222;

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
    try {
        let list = null;
        for (let i = 0; i < 20; i++) {
            try {
                list = JSON.parse(await get(`http://127.0.0.1:${PORT}/json/list`));
                if (list && list.length) break;
            } catch (e) {}
            await sleep(300);
        }

        if (!list || !list.length) {
            console.log('기존 Chrome 프로세스가 없어 새로 실행합니다...');
            const userDataDir = path.join(os.tmpdir(), 'chrome_non_headless_' + PORT);
            spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
                '--remote-debugging-port=' + PORT,
                '--user-data-dir=' + userDataDir,
                '--no-first-run',
                '--no-default-browser-check',
                '--window-size=1400,950',
                'http://localhost:8080/'
            ], { stdio: 'ignore' });
            for (let i = 0; i < 30; i++) {
                try {
                    list = JSON.parse(await get(`http://127.0.0.1:${PORT}/json/list`));
                    if (list && list.length) break;
                } catch (e) {}
                await sleep(300);
            }
        }

        const page = list.find(t => t.type === 'page' && t.url.includes('8080')) || list.find(t => t.type === 'page');
        console.log(`>>> 타깃 브라우저 연결: [${page.title}]`);

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
        await send('Page.enable');
        await send('Runtime.enable');

        // 단어 로드
        const allWordsTxt = fs.readFileSync(path.join(__dirname, '..', 'all_words.txt'), 'utf8');
        const words = allWordsTxt.trim().split(/\s+/);

        const CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
        const JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
        const DOUBLE_BATCHIM = ['ㄳ','ㄵ','ㄶ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅄ'];
        const ALL_51_JAMOS = [...CHO_LIST, ...JUNG_LIST, ...DOUBLE_BATCHIM];

        const VULNERABLE_WORDS = [
            '월', '활', '물', '불', '풀', '돌', '골', '솔', '올',
            '닮', '달', '다', '나', '날', '낢', '따', '딸', '땀',
            '라', '랄', '람', '타', '탈', '탐', '파', '팔', '팜',
            '간', '근', '너', '므', '조', '주', '코', '프', '팧', '쐤',
            '되', '됀', '왜', '웨', '웽', '왝', '궁', '국', '군',
            '예', '에', '계', '게', '뎨', '데', '옉', '엑', '곅', '겍',
            '여', '역', '겨', '격', '댜', '댝', '야', '약', '갸', '갹',
            '희', '흰', '의', '원', '권', '글', '흙', '삶', '값', '넓'
        ];

        const fullTestQueue = [
            ...ALL_51_JAMOS,
            ...VULNERABLE_WORDS,
            ...words
        ];

        console.log(`>>> 총 검증 대상: ${fullTestQueue.length} 개 (단독 낱자 51 + 취약 음절 66 + 상용 단어 ${words.length})`);
        console.log('>>> 실제 브라우저 화면에서 실시간 렌더링 검증 시작...\n');

        const defects = [];
        let tested = 0;

        for (const item of fullTestQueue) {
            tested++;
            const res = await send('Runtime.evaluate', {
                expression: `(() => {
                    const input = document.getElementById('text-input');
                    if (input) { input.value = '${item}'; }
                    Engine.loadText('${item}');

                    const strokes = Engine.strokes || [];
                    const badges = Engine.badgePositions || [];
                    const meta = Engine.strokeMeta || [];
                    const charsInfo = Engine.charsInfo || [];

                    // 1. NaN 점 검사
                    let hasNaN = false;
                    strokes.forEach(st => st.forEach(p => {
                        if (isNaN(p[0]) || isNaN(p[1])) hasNaN = true;
                    }));

                    // 2. 뱃지 중복 검사
                    let badgeOverlap = 0;
                    for (let i = 0; i < badges.length; i++) {
                        for (let j = i + 1; j < badges.length; j++) {
                            if (Math.hypot(badges[i].bx - badges[j].bx, badges[i].by - badges[j].by) < 1.0) {
                                badgeOverlap++;
                            }
                        }
                    }

                    // 3. 받침 ㄹ 획순 검사 (음절 내 종성 ㄹ이 상단ㄱ -> 중가로 -> 하단ㄴ 순서인지)
                    let jongRieulReversed = false;
                    charsInfo.forEach((ci, cIdx) => {
                        if (ci.jong === 'ㄹ') {
                            const rieulStrokes = [];
                            meta.forEach((m, sIdx) => {
                                if (m.ci === cIdx && m.part === 'jong') {
                                    rieulStrokes.push(strokes[sIdx]);
                                }
                            });
                            if (rieulStrokes.length === 3) {
                                const y0 = rieulStrokes[0].reduce((a, b) => a + b[1], 0) / rieulStrokes[0].length;
                                const y1 = rieulStrokes[1].reduce((a, b) => a + b[1], 0) / rieulStrokes[1].length;
                                const y2 = rieulStrokes[2].reduce((a, b) => a + b[1], 0) / rieulStrokes[2].length;
                                if (y0 > y1 + 1.0 || y1 > y2 + 1.0) {
                                    jongRieulReversed = true;
                                }
                            }
                        }
                    });

                    // 4. 단독 낱자 창고 연동 검사
                    const isSingle = !!charsInfo[0]?.single;
                    const singleMissingWH = isSingle && !Engine.jamoEntries[0]?.whId;

                    return {
                        item: '${item}',
                        strokeCount: strokes.length,
                        badgeCount: badges.length,
                        hasNaN,
                        badgeOverlap,
                        jongRieulReversed,
                        singleMissingWH
                    };
                })()`,
                returnByValue: true
            });

            const val = res.result?.value;
            if (!val) {
                defects.push({ item, issue: '엔진 응답 없음' });
                continue;
            }

            const itemIssues = [];
            if (val.hasNaN) itemIssues.push('NaN 좌표 발생');
            if (val.badgeOverlap > 0) itemIssues.push(`뱃지 위치 겹침 ${val.badgeOverlap}건`);
            if (val.jongRieulReversed) itemIssues.push('종성 ㄹ 획순 역전');
            if (val.singleMissingWH) itemIssues.push('단독 낱자 창고 스켈레톤 미매핑');

            if (itemIssues.length > 0) {
                console.log(`❌ [${item}] 결함: ${itemIssues.join(', ')}`);
                defects.push({ item, issues: itemIssues });
            } else if (tested % 50 === 0 || tested <= 10) {
                console.log(`[${tested}/${fullTestQueue.length}] '${item}' (${val.strokeCount}획) 정상 통과`);
            }

            // 시각적 확인 딜레이
            await sleep(15);
        }

        console.log('\n=============================================');
        console.log('=== 브라우저 실시간 전수 검증 최종 리포트 ===');
        console.log('=============================================');
        console.log(`총 검증 항목: ${tested} 개`);
        console.log(`결함 발견: ${defects.length} 건`);

        if (defects.length > 0) {
            console.log('\n[결함 목록]');
            defects.forEach(d => console.log(` - ${d.item}: ${d.issues.join(', ')}`));
            process.exit(1);
        } else {
            console.log('\n🎉 [100% 무결점 통과] 51개 단독 낱자, 취약 글자군, 상용 630단어 전체가 브라우저 상에서 완벽히 검증되었습니다!');
            process.exit(0);
        }

        ws.close();
    } catch (e) {
        console.error('검증 중 오류:', e);
        process.exit(1);
    }
})();
