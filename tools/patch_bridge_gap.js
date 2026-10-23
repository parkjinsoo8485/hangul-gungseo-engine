const fs = require('fs');
const f = 'c:/project/한글획순/warehouse_bridge.js';
let t = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');

// 1. getRoleGapMin 함수 정의
const helper = `
    /** 자소 역할 및 모음 유형에 따른 맞춤형 최소 허용 간격 */
    function getRoleGapMin(a, b, vType) {
        if ((a === 'cho' && b === 'jung') || (a === 'jung' && b === 'cho')) {
            return vType === 'V' ? 3.0 : 0.4; // 세로모음은 완전 분리, 가로/복합모음은 정통 궁체 접필 밀착 허용
        }
        if ((a === 'cho' && b === 'jong') || (a === 'jong' && b === 'cho')) {
            return 2.0; // 초성과 종성은 상하 분리 유지
        }
        if ((a === 'jung' && b === 'jong') || (a === 'jong' && b === 'jung')) {
            return 1.2; // 중성과 종성은 하단 비침범 유지
        }
        return 1.5;
    }
`;

// 2. checkSyllable 수정
const oldCheck = `        const lay = WH.layoutSyllable(ch, sp, opt);
        if (!lay) return { ch, skipped: true, issues: [] };
        const o = Object.assign({ margin: 2.5, gapMin: 4.2 }, opt || {});
        const issues = [];
        const pts = lay.map(part => {
            const s = part.strokes.map(st => sample(st, 2.0));
            const all = s.flat();
            const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
            return { part: part.part, s, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
        });
        pts.forEach(P => P.s.forEach(st => st.forEach(([x, y]) => {
            if (!isFinite(x) || !isFinite(y)) issues.push({ t: 'nan', part: P.part });
            else if (x < o.margin || x > 100 - o.margin || y < o.margin || y > 100 - o.margin) {
                issues.push({ t: 'bounds', part: P.part, x, y });
            }
        })));
        for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
            const A = pts[a].bb, B = pts[b].bb;
            if (Math.max(A[0] - B[2], B[0] - A[2], A[1] - B[3], B[1] - A[3]) > o.gapMin) continue;
            let best = 1e9, bp = null;
            pts[a].s.forEach(sa => sa.forEach(pa => pts[b].s.forEach(sb => sb.forEach(pb => {
                const d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
                if (d < best) { best = d; bp = [pa, pb]; }
            }))));
            if (best < o.gapMin) issues.push({ t: 'gap', a: pts[a].part, b: pts[b].part, d: best, bp });
        }
        return { ch, issues };`;

const newCheck = `        const info = WH.env.decomposeHangul ? WH.env.decomposeHangul(ch) : null;
        const vType = info ? (WH.env.VOWEL_TYPE[info.jung] || 'V') : 'V';
        const lay = WH.layoutSyllable(ch, sp, opt);
        if (!lay) return { ch, skipped: true, issues: [] };
        const o = Object.assign({ margin: 2.2 }, opt || {});
        const issues = [];
        const pts = lay.map(part => {
            const s = part.strokes.map(st => sample(st, 2.0));
            const all = s.flat();
            const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
            return { part: part.part, s, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
        });
        pts.forEach(P => P.s.forEach(st => st.forEach(([x, y]) => {
            if (!isFinite(x) || !isFinite(y)) issues.push({ t: 'nan', part: P.part });
            else if (x < o.margin || x > 100 - o.margin || y < o.margin || y > 100 - o.margin) {
                issues.push({ t: 'bounds', part: P.part, x, y });
            }
        })));
        for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
            const roleA = pts[a].part, roleB = pts[b].part;
            const threshold = getRoleGapMin(roleA, roleB, vType);
            const A = pts[a].bb, B = pts[b].bb;
            if (Math.max(A[0] - B[2], B[0] - A[2], A[1] - B[3], B[1] - A[3]) > threshold) continue;
            let best = 1e9, bp = null;
            pts[a].s.forEach(sa => sa.forEach(pa => pts[b].s.forEach(sb => sb.forEach(pb => {
                const d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
                if (d < best) { best = d; bp = [pa, pb]; }
            }))));
            if (best < threshold) issues.push({ t: 'gap', a: roleA, b: roleB, d: best, bp, threshold });
        }
        return { ch, issues };`;

// 3. severity 및 chooseChoForm 수정
const oldSeverity = `    function severity(r, gapMin) {
        let s = 0;
        r.issues.forEach(i => { s += i.t === 'gap' ? (gapMin - i.d) : 2; });
        return s;
    }

    /** 초성 형(T1~T3) 중 이탈·충돌이 가장 적은 형을 선택 */
    WH.chooseChoForm = function (ch, sp, opt) {
        const info = WH.env.decomposeHangul(ch);
        if (!info || info.single) return null;
        const gapMin = (opt && opt.gapMin) || 4.2;
        let bestT = null, bestS = Infinity;
        for (const T of [null, 1, 2, 3]) {
            const o = Object.assign({}, opt, { choT: T || undefined });
            delete o.onProgress;
            const r = WH.checkSyllable(ch, sp, T ? o : Object.assign({}, o, { choT: undefined }));
            if (r.skipped) return null;
            const s = severity(r, gapMin) + (T === null ? 0 : 0.001);
            if (s < bestS - 1e-6) { bestS = s; bestT = T; }
            if (bestS === 0) break;
        }
        return bestT;
    };`;

const newSeverity = `    function severity(r) {
        let s = 0;
        r.issues.forEach(i => { s += i.t === 'gap' ? ((i.threshold || 2.0) - i.d) : 2.5; });
        return s;
    }

    /** 초성 형(T1~T3) 중 이탈·충돌이 가장 적은 형을 선택 */
    WH.chooseChoForm = function (ch, sp, opt) {
        const info = WH.env.decomposeHangul(ch);
        if (!info || info.single) return null;
        let bestT = null, bestS = Infinity;
        for (const T of [null, 1, 2, 3]) {
            const o = Object.assign({}, opt, { choT: T || undefined });
            delete o.onProgress;
            const r = WH.checkSyllable(ch, sp, T ? o : Object.assign({}, o, { choT: undefined }));
            if (r.skipped) return null;
            const s = severity(r) + (T === null ? 0 : 0.001);
            if (s < bestS - 1e-6) { bestS = s; bestT = T; }
            if (bestS === 0) break;
        }
        return bestT;
    };`;

// 4. applyFix push 수정
const oldPush = `                const push = (4.2 - is.d) / 2 + 0.1;`;
const newPush = `                const threshold = is.threshold || 2.0;
                const push = (threshold - is.d) / 2 + 0.15;`;

if (!t.includes(oldCheck)) { console.error('FAIL: oldCheck not found'); process.exit(1); }
t = t.replace(oldCheck, helper + '\n' + newCheck);

if (!t.includes(oldSeverity)) { console.error('FAIL: oldSeverity not found'); process.exit(1); }
t = t.replace(oldSeverity, newSeverity);

if (!t.includes(oldPush)) { console.error('FAIL: oldPush not found'); process.exit(1); }
t = t.replace(oldPush, newPush);

fs.writeFileSync(f, t.replace(/\n/g, '\r\n'));
console.log('Successfully updated warehouse_bridge.js with contextual gap solver!');
