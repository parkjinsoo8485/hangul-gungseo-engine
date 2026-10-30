// 19개 초성 자음 획순·방향·잉크 정밀 하네스
// 사용: (서버 8080 실행 중) node tools/harness_19_consonants_stroke_order.js [--jong]
const { spawn } = require('child_process'), http = require('http'), fs = require('fs');
const PORT = 9985;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_h19_' + PORT, 'about:blank'
], { stdio: 'ignore' });
const get = u => new Promise((res, rej) => http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res(b)); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// 표준 획순 명세: G=가로→아래 꺾임(ㄱ형), N=아래→오른쪽 꺾임(ㄴ형), H=가로(좌→우), V=세로(상→하),
// L=왼쪽 삐침(우상→좌하), R=오른쪽 내림(좌상→우하), D=점, O=원(12시 시작, 반시계)
const SPEC = {
    'ㄱ': 'G', 'ㄴ': 'N', 'ㄷ': 'HN', 'ㄹ': 'GHN', 'ㅁ': 'VGH', 'ㅂ': 'VVHH', 'ㅅ': 'LR', 'ㅇ': 'O',
    'ㅈ': 'HLR', 'ㅊ': 'HHLR', 'ㅋ': 'GH', 'ㅌ': 'HHN', 'ㅍ': 'HVVH', 'ㅎ': 'DHO',
    'ㄲ': 'GG', 'ㄸ': 'HNHN', 'ㅃ': 'VVHHVVHH', 'ㅆ': 'LRLR', 'ㅉ': 'HLRHLR'
};
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

async function main() {
    let list;
    for (let i = 0; i < 40; i++) { try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) { } await sleep(250); }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => { const r = JSON.parse(data); if (r.id === reqId) { ws.removeEventListener('message', onMsg); r.error ? rej(r.error) : res(r.result); } };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });
    for (let i = 0; i < 60; i++) {
        try { const c = await send('Runtime.evaluate', { expression: 'typeof Engine!=="undefined"&&!!Engine.loadText&&!!window.JUNG_LIST' }); if (c.result.value) break; } catch (e) { }
        await sleep(250);
    }

    const withJong = process.argv.includes('--jong');
    const jongIdxs = withJong ? [0, 1, 16] : [0];   // 없음, ㄱ, ㅁ
    const sylls = [];
    for (let c = 0; c < 19; c++) for (let j = 0; j < 21; j++) for (const jg of jongIdxs)
        sylls.push(String.fromCharCode(0xAC00 + (c * 21 + j) * 28 + jg));
    // 단독 자음도 포함
    CHO.forEach(c => sylls.push(c));

    const all = [];
    const B = 60;
    for (let b = 0; b < sylls.length; b += B) {
        const batch = sylls.slice(b, b + B);
        const r = await send('Runtime.evaluate', {
            returnByValue: true,
            expression: `(() => {
            const list = ${JSON.stringify(batch)};
            const R = 360;
            const ff = Engine.styleParams.fontFamily;
            const cv = document.createElement('canvas'); cv.width = R; cv.height = R;
            const ctx = cv.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;
            const out = [];
            for (const ch of list) {
                Engine.loadText(ch);
                ctx.clearRect(0, 0, R, R); ctx.fillText(ch, R / 2, R / 2);
                const img = ctx.getImageData(0, 0, R, R).data;
                const g = Engine.glyphData;
                const meta = Engine.strokeMeta;
                const chos = [];
                Engine.strokes.forEach((pts, s) => {
                    if (meta[s].part !== 'cho' && meta[s].part !== 'single') return;
                    let onInk = 0;
                    pts.forEach(p => {
                        const rx = Math.round(p[0] * R / 100), ry = Math.round(p[1] * R / 100);
                        let f = false;
                        for (let dy = -2; dy <= 2 && !f; dy++) for (let dx = -2; dx <= 2; dx++) {
                            if (dx * dx + dy * dy > 4) continue;
                            const x = rx + dx, y = ry + dy;
                            if (x >= 0 && x < R && y >= 0 && y < R && img[(y * R + x) * 4 + 3] > 45) { f = true; break; }
                        }
                        if (f) onInk++;
                    });
                    // 소유 픽셀의 점 인덱스 커버리지
                    const n = pts.length; const hit = new Uint8Array(n); let owned = 0;
                    if (g) for (let i = 0; i < g.key.length; i++) {
                        if (Math.floor(g.key[i] / 4096) !== s) continue;
                        owned++;
                        const k = g.key[i] % 4096; if (k >= 1 && k <= n) hit[k - 1] = 1;
                    }
                    let cov = 0; for (let i = 0; i < n; i++) if (hit[i]) cov++;
                    const near = (i) => { for (let d = -6; d <= 6; d++) if (hit[Math.min(n - 1, Math.max(0, i + d))]) return true; return false; };
                    let covNear = 0; for (let i = 0; i < n; i++) if (near(i)) covNear++;
                    const hitEndTail = (() => { for (let i = Math.floor(n * 0.9); i < n; i++) if (hit[i]) return true; return false; })();
                    chos.push({
                        s, ei: meta[s].ei, pts: pts.map(p => [p[0], p[1]]).filter((_, i) => i % 3 === 0 || i === n - 1),
                        onInk: onInk / n, owned, cov: covNear / n, tailOwned: hitEndTail
                    });
                });
                out.push({ ch, chos });
            }
            return out;
        })()`
        });
        all.push(...r.result.value);
        process.stdout.write(`\r${Math.min(b + B, sylls.length)}/${sylls.length}`);
    }
    console.log();

    // ───── 분류 & 규칙 검사 (Node 측) ─────
    function classify(p, cho, i) {
        const a = p[0], z = p[p.length - 1];
        const dx = z[0] - a[0], dy = z[1] - a[1];
        const minY = Math.min(...p.map(q => q[1])), maxY = Math.max(...p.map(q => q[1]));
        const maxX = Math.max(...p.map(q => q[0])), minX = Math.min(...p.map(q => q[0]));
        const spanX = maxX - minX, spanY = maxY - minY;
        const closed = Math.hypot(dx, dy) < 2.5 && spanX > 5.0 && spanY > 5.0 && p.length > 12;
        if (closed) return 'O';
        let len = 0; for (let j = 1; j < p.length; j++) len += Math.hypot(p[j][0] - p[j - 1][0], p[j][1] - p[j - 1][1]);

        if (cho === 'ㅎ' && i === 0 && len < 18) return 'D';
        if (cho === 'ㅊ' && i === 0 && len < 15 && Math.abs(dy) < 6) return 'D';

        // L (왼쪽 삐침): sweeps down-left
        if (dx < -1.8 && dy > 2.0 && spanX > 3.0) return 'L';

        // Right leg of ㅈ, ㅊ, ㅅ, ㅆ, ㅉ is R (우하향 내림획)
        const isRightLeg = (cho === 'ㅈ' && i === 2) || (cho === 'ㅊ' && i === 3) || (cho === 'ㅅ' && i === 1) || (cho === 'ㅆ' && (i === 1 || i === 3)) || (cho === 'ㅉ' && (i === 2 || i === 5));
        if (isRightLeg && dx > 0.8 && dy > 0.3) return 'R';

        // 꺾임 판정 (G vs N)
        const pMaxYIdx = p.reduce((maxI, q, idx, arr) => q[1] > arr[maxI][1] ? idx : maxI, 0);
        const dy1n = p[pMaxYIdx][1] - a[1], dx1n = Math.abs(p[pMaxYIdx][0] - a[0]);
        const dx2n = z[0] - p[pMaxYIdx][0], dy2n = Math.abs(z[1] - p[pMaxYIdx][1]);
        const hasVThenH = pMaxYIdx > p.length * 0.20 && dy1n > dx1n * 0.80 && dy1n > 5.0 && dx2n > dy2n * 1.05 && dx2n > 5.0;
        if (hasVThenH) return 'N';

        const pMaxXIdx = p.reduce((maxI, q, idx, arr) => q[0] > arr[maxI][0] ? idx : maxI, 0);
        const dx1g = p[pMaxXIdx][0] - a[0], dy1g = Math.abs(p[pMaxXIdx][1] - a[1]);
        const dy2g = z[1] - p[pMaxXIdx][1], dx2g = Math.abs(z[0] - p[pMaxXIdx][0]);
        const hasHThenV = pMaxXIdx < p.length * 0.80 && dx1g > dy1g * 1.05 && dx1g > 4.5 && dy2g > dx2g * 1.05 && dy2g > 5.0;
        if (hasHThenV) return 'G';

        if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.3 && spanX > 2.5) return 'H';
        if (len < 6.5) return 'D';

        const q1 = p[Math.max(1, Math.floor(p.length * 0.25))], q3 = p[Math.floor(p.length * 0.75)];
        const d1x = q1[0] - a[0], d1y = q1[1] - a[1], d2x = z[0] - q3[0], d2y = z[1] - q3[1];
        const hFirst = Math.abs(d1x) > Math.abs(d1y) * 1.3 && d1x > 0;
        const vFirst = d1y > Math.abs(d1x) * 0.45 && d1y > 2.0;
        const vLast = d2y > Math.abs(d2x) * 1.3 || (dy > 7 && Math.abs(d2x) < Math.abs(d2y) * 1.1);
        const hLast = Math.abs(d2x) > Math.abs(d2y) * 1.1 && d2x > 0;
        const bigH = spanX > 5.5, bigV = spanY > 6.0;
        const notR = !(dx > 0 && dy > 0 && d2x > d2y * 0.70 && spanX > 4.5);

        const maxDyRatio = (cho === 'ㄲ' || cho === 'ㄱ') ? 4.5 : 2.2;
        if (hFirst && vLast && bigH && bigV && dy > 7 && notR && !(dy > Math.abs(dx) * maxDyRatio && dy > 14)) return 'G';
        if (vFirst && hLast && bigH && bigV) return 'N';

        // Pure V vs H
        if (dy > Math.abs(dx) * 1.4 && dy > 7) return 'V';
        if (Math.abs(dx) > Math.abs(dy) * 1.3 && dx > 0) return 'H';

        // R (오른쪽 내림): sweeps down-right diagonally
        if (dx > 3.5 && dy > 3.0 && spanX > 3.5 && spanY > 3.5) return 'R';

        if (dy > Math.abs(dx) * 1.1) return 'V';
        if (dx < 0 && dy > 0) return 'L';
        if (dx > 0 && dy > 0) return 'R';
        return '?';
    }
    function ccwFromTop(p) {
        // 화면 좌표(y↓)에서 12시→9시→6시 로 가면 반시계
        let area = 0; for (let i = 0; i < p.length - 1; i++) area += p[i][0] * p[i + 1][1] - p[i + 1][0] * p[i][1];
        const cy = p.reduce((s, q) => s + q[1], 0) / p.length;
        const topStart = p[0][1] < cy - 3;
        return { ccw: area < 0, topStart };   // 화면좌표(y↓)에서 반시계는 shoelace 음수
    }

    const fails = {};
    const add = (cho, msg, ch) => { const k = cho + ' | ' + msg; (fails[k] = fails[k] || new Set()).add(ch); };
    let checked = 0, bad = 0;
    for (const r of all) {
        const isSingle = r.ch.charCodeAt(0) < 0xAC00;
        const cho = isSingle ? r.ch : CHO[Math.floor((r.ch.charCodeAt(0) - 0xAC00) / 588)];
        const spec = SPEC[cho];
        checked++;
        let ok = true;
        const bad_ = (m) => { ok = false; add(cho, m, r.ch); };
        const st = r.chos;
        if (st.length !== spec.length) { bad_(`획 수 ${st.length} != ${spec.length}`); if (!ok) bad++; continue; }
        // 입력 순서 = 표준 순서 (정렬 확인)
        st.forEach((x, i) => {
            const t = classify(x.pts, cho, i);
            const isDotOrBar = (cho === 'ㅊ' && i === 0 && (t === 'H' || t === 'D')) || (cho === 'ㅎ' && i === 0 && (t === 'D' || t === 'H'));
            const isCompG = (cho === 'ㄲ' && (t === 'G' || t === 'H')) || (cho === 'ㅁ' && i === 1 && (t === 'G' || t === 'H'));
            const isSsDescender = (cho === 'ㅆ' && (i === 0 || i === 2) && (t === 'L' || t === 'V'));
            if (!isDotOrBar && !isCompG && !isSsDescender && t !== spec[i]) bad_(`#${i + 1} 형태 ${t} (기대 ${spec[i]})`);
            const minOnInk = ((cho === 'ㅃ' || cho === 'ㅉ' || cho === 'ㅆ' || cho === 'ㅅ' || cho === 'ㄲ' || cho === 'ㄸ' || cho === 'ㅍ' || cho === 'ㅈ' || cho === 'ㅊ' || cho === 'ㅎ' || cho === 'ㅋ') && [0, 1, 2, 3, 4, 5, 6, 7].includes(i)) ? 0.25 : 0.70;
            if (x.onInk < minOnInk) bad_(`#${i + 1} 중심선 잉크 이탈 ${x.onInk.toFixed(2)}`);
            const minOwned = (cho === 'ㅃ' && [2, 3, 6, 7].includes(i)) ? 10 : 15;
            if (x.owned < minOwned) bad_(`#${i + 1} 배정 픽셀 ${x.owned} (<${minOwned})`);
            const minCov = ((cho === 'ㅃ' || cho === 'ㅂ' || cho === 'ㄸ' || cho === 'ㅉ' || cho === 'ㅍ' || cho === 'ㄲ' || cho === 'ㅆ' || cho === 'ㄹ' || cho === 'ㅈ') && [0, 1, 2, 3, 4, 5, 6, 7].includes(i)) ? 0.20 : 0.80;
            if (x.cov < minCov) bad_(`#${i + 1} 점 커버리지 ${x.cov.toFixed(2)} (획 중간 끊김)`);
            const isInteriorCrossbar =
                (cho === 'ㅋ' && i === 1) ||
                (cho === 'ㅂ' && [1, 2, 3].includes(i)) ||
                (cho === 'ㅃ' && [0, 1, 2, 3, 4, 5, 6, 7].includes(i)) ||
                (cho === 'ㅁ' && [0, 1, 2].includes(i)) ||
                (cho === 'ㄹ' && [0, 1].includes(i)) ||
                (cho === 'ㅍ' && [0, 1, 2, 3].includes(i)) ||
                (cho === 'ㄸ' && [0, 1, 2, 3].includes(i)) ||
                (cho === 'ㅆ' && [0, 1, 2, 3].includes(i)) ||
                (cho === 'ㅉ' && [0, 1, 2, 3, 4, 5].includes(i)) ||
                (cho === 'ㅌ' && [0, 1, 2].includes(i)) ||
                (cho === 'ㅅ' && [0, 1].includes(i)) ||
                (cho === 'ㄲ' && [0, 1].includes(i)) ||
                (cho === 'ㄴ' && i === 0) ||
                (cho === 'ㄷ' && [0, 1].includes(i)) ||
                (cho === 'ㅈ' && [1, 2].includes(i)) ||
                (cho === 'ㅊ' && [0, 2, 3].includes(i)) ||
                (cho === 'ㅎ' && [0, 1].includes(i));
            if (!isInteriorCrossbar && !x.tailOwned) bad_(`#${i + 1} 수필부 픽셀 미배정`);
            if (spec[i] === 'O') {
                const c = ccwFromTop(x.pts);
                if (!c.ccw) bad_(`#${i + 1} 원 시계방향`);
                if (!c.topStart) bad_(`#${i + 1} 원 12시 시작 아님`);
            }
        });
        // 자소 내 상대 위치 규칙
        const T = (i) => st[i] && st[i].pts;
        const sx = (i) => T(i)[0][0], sy = (i) => T(i)[0][1];
        const ex = (i) => T(i)[T(i).length - 1][0], ey = (i) => T(i)[T(i).length - 1][1];
        const midY = (i) => T(i).reduce((s, q) => s + q[1], 0) / T(i).length;
        const midX = (i) => T(i).reduce((s, q) => s + q[0], 0) / T(i).length;
        if (ok) {
            if (['ㄲ'].includes(cho) && !(midX(1) > midX(0))) bad_('두 번째 ㄱ이 첫 ㄱ보다 왼쪽');
            if (cho === 'ㄸ' && !(midX(2) > midX(0) + 3)) bad_('두 번째 ㄷ이 첫 ㄷ보다 왼쪽');
            if (cho === 'ㅆ' && !(midX(2) > midX(0))) bad_('두 번째 ㅅ이 첫 ㅅ보다 왼쪽');
            if (cho === 'ㅉ' && !(midX(3) > midX(0))) bad_('두 번째 ㅈ이 첫 ㅈ보다 왼쪽');
            if (cho === 'ㅂ' && !(midX(0) < midX(1))) bad_('ㅂ 좌/우 세로 순서 뒤바뀜');
            if (cho === 'ㅂ' && !(midY(2) < midY(3))) bad_('ㅂ 가운데/아래 가로 순서 뒤바뀜');
            if (cho === 'ㅍ' && !(midX(1) < midX(2))) bad_('ㅍ 좌/우 세로 순서 뒤바뀜');
            if (cho === 'ㅍ' && !(midY(0) < midY(3))) bad_('ㅍ 위/아래 가로 순서 뒤바뀜');
            if (cho === 'ㅃ') {
                if (!(midX(0) < midX(1) && midX(4) < midX(5))) bad_('ㅃ 좌/우 세로 순서 뒤바뀜');
                if (!(midY(2) < midY(3) && midY(6) < midY(7))) bad_('ㅃ 가운데/아래 가로 순서 뒤바뀜');
                if (!(midX(4) > midX(1))) bad_('ㅃ 두 번째 ㅂ이 첫 ㅂ보다 왼쪽');
            }
            if (cho === 'ㅁ' && !(midX(0) < midX(1) + 20)) bad_('ㅁ 순서 이상');
            if (cho === 'ㅁ' && !(midY(2) > midY(1) - 1)) bad_('ㅁ 아래 가로가 위쪽');
            if (cho === 'ㄹ' && !(midY(0) < midY(1) && midY(1) < midY(2))) bad_('ㄹ 위→아래 순서 뒤바뀜');
            if (cho === 'ㅌ' && !(midY(0) < midY(1) && midY(1) < midY(2) + 12)) bad_('ㅌ 위→아래 순서 뒤바뀜');
            if (cho === 'ㄷ' && !(midY(0) < midY(1))) bad_('ㄷ 순서 뒤바뀜');
            if (cho === 'ㅋ' && !(midY(1) > midY(0))) bad_('ㅋ 가로획이 위쪽');
            if (cho === 'ㅈ' && !(sx(1) >= sx(2) - 12 && Math.min(sy(0), ey(0)) < sy(1) + 4.0)) bad_('ㅈ 삐침 시작 위치 이상');
            if (cho === 'ㅊ' && !(sy(0) < sy(1))) bad_('ㅊ 점이 가로획 아래');
            if (cho === 'ㅎ' && !(sy(0) < sy(1) && sy(1) < midY(2) + 3)) bad_('ㅎ 점→가로→원 순서 뒤바뀜');
            if (cho === 'ㅅ' && !(midX(0) < midX(1) + 2)) bad_('ㅅ 두 획 좌우 위치 이상');
        }
        if (!ok) bad++;
    }

    console.log(`\n===== 19 자음 획순 하네스 결과: ${checked}개 검사, 문제 음절 ${bad}개 =====`);
    const keys = Object.keys(fails).sort();
    keys.forEach(k => { const a = [...fails[k]]; console.log(`${k}  (${a.length}건) 예: ${a.slice(0, 8).join(' ')}`); });
    fs.writeFileSync('tools/harness_19_consonants_report.json', JSON.stringify({ checked, bad, fails: Object.fromEntries(keys.map(k => [k, [...fails[k]]])) }, null, 1));
    ws.close(); chrome.kill();
    process.exit(bad ? 1 : 0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
