const fs = require('fs');
const f = 'c:/project/한글획순/warehouse_bridge.js';
let t = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
function rep(a, b, label) {
    const c = t.split(a).length - 1;
    if (c !== 1) { console.error('FAIL', label, c); process.exit(1); }
    t = t.replace(a, () => b); console.log('ok', label);
}
rep("        offsets: {},", "        choT: {},           // 하네스가 고른 음절별 초성 형 { '곰': 2 }\n        offsets: {},", 'state');
rep("        const cho = make('cho', info.cho, opt.choT);", "        const cho = make('cho', info.cho, opt.choT || WH.choT[info.char]);", 'choT use');

// 빠른 검사: 샘플 간격 확대 + 바운딩 박스 사전 필터
rep("const pts = lay.map(part => ({ part: part.part, s: part.strokes.map(st => sample(st, 1.2)) }));",
    "const pts = lay.map(part => {\n            const s = part.strokes.map(st => sample(st, 2.0));\n            const all = s.flat();\n            const xs = all.map(p => p[0]), ys = all.map(p => p[1]);\n            return { part: part.part, s, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };\n        });", 'sample');
rep("            let best = 1e9, bp = null;\n            pts[a].s.forEach(sa =>",
    "            const A = pts[a].bb, B = pts[b].bb;\n            if (Math.max(A[0] - B[2], B[0] - A[2], A[1] - B[3], B[1] - A[3]) > o.gapMin) continue;\n            let best = 1e9, bp = null;\n            pts[a].s.forEach(sa =>", 'bbox');

// 심각도 + 초성 형 선택
rep("    /** 허용 범위 내 자동 보정:",
    `    function severity(r, gapMin) {
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
    };

    /** 허용 범위 내 자동 보정:`, 'severity+choose');

rep("                        const r = WH.checkSyllable(chars[i], sp, opt);",
    "                        if (round === 1 && !WH.choT[chars[i]]) {\n                            const T = WH.chooseChoForm(chars[i], sp, opt);\n                            if (T) WH.choT[chars[i]] = T;\n                        }\n                        const r = WH.checkSyllable(chars[i], sp, opt);", 'harness choose');
rep("WH.load(d); WH.offsets = {};", "WH.load(d); WH.offsets = {}; WH.choT = {};", 'livesync reset');
fs.writeFileSync(f, t.replace(/\n/g, '\r\n'));
