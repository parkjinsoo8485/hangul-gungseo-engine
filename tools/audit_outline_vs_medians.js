// 검증 전용(읽기 전용): gungsuhOutline 과 medians 의 실제 관계를 측정한다.
const fs = require('fs');
const wh = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));

function parse(d) {
    // M/L/Q/Z 만 처리 -> 서브패스별 폴리라인
    const toks = d.match(/[MLQCZ]|-?\d+\.?\d*/g) || [];
    const subs = []; let cur = null; let i = 0, cmd = null, px = 0, py = 0;
    const num = () => parseFloat(toks[i++]);
    while (i < toks.length) {
        if (/[MLQCZ]/.test(toks[i])) cmd = toks[i++];
        if (cmd === 'M') { px = num(); py = num(); cur = [[px, py]]; subs.push(cur); cmd = 'L'; }
        else if (cmd === 'L') { px = num(); py = num(); cur.push([px, py]); }
        else if (cmd === 'Q') {
            const cx = num(), cy = num(), ex = num(), ey = num();
            for (let t = 0.2; t <= 1.0001; t += 0.2) {
                const m = 1 - t;
                cur.push([m * m * px + 2 * m * t * cx + t * t * ex, m * m * py + 2 * m * t * cy + t * t * ey]);
            }
            px = ex; py = ey;
        } else if (cmd === 'C') { for (let k = 0; k < 6; k++) num(); }
        else if (cmd === 'Z') { cmd = null; }
        else break;
    }
    return subs;
}
function inside(pt, subs) {
    let c = 0;
    subs.forEach(poly => {
        for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
            const [xi, yi] = poly[a], [xj, yj] = poly[b];
            if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
        }
    });
    return c;
}
function distEdge(pt, subs) {
    let best = 1e9;
    subs.forEach(poly => {
        for (let a = 0; a < poly.length - 1; a++) {
            const [x1, y1] = poly[a], [x2, y2] = poly[a + 1];
            const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy || 1;
            let t = ((pt[0] - x1) * dx + (pt[1] - y1) * dy) / L; t = Math.max(0, Math.min(1, t));
            const d = Math.hypot(pt[0] - (x1 + t * dx), pt[1] - (y1 + t * dy));
            if (d < best) best = d;
        }
    });
    return best;
}
function sample(st, step) {
    const out = [];
    for (let k = 0; k < st.length - 1; k++) {
        const L = Math.hypot(st[k + 1][0] - st[k][0], st[k + 1][1] - st[k][1]);
        const n = Math.max(1, Math.round(L / step));
        for (let s = 0; s < n; s++) out.push([st[k][0] + (st[k + 1][0] - st[k][0]) * s / n, st[k][1] + (st[k + 1][1] - st[k][1]) * s / n]);
    }
    out.push(st[st.length - 1]);
    return out;
}

const rows = []; let subMismatch = 0; const worst = [];
Object.entries(wh.parts).forEach(([id, p]) => {
    const subs = parse(p.gungsuhOutline || '');
    if (subs.length !== p.medians.length) subMismatch++;
    let tot = 0, ins = 0; const widths = [];
    p.medians.forEach(st => sample(st, 8).forEach(pt => { tot++; if (inside(pt, subs)) { ins++; widths.push(distEdge(pt, subs) * 2); } }));
    const ratio = ins / tot;
    rows.push({ id, subs: subs.length, strokes: p.medians.length, insidePct: +(ratio * 100).toFixed(1), wMin: Math.min(...widths) | 0, wMax: Math.max(...widths) | 0 });
    if (ratio < 0.9) worst.push(id + ' ' + (ratio * 100).toFixed(0) + '%');
});
console.log('부품 수:', rows.length);
console.log('외곽선 서브패스 수 != 획 수 인 부품:', subMismatch);
console.log('중심선 점이 외곽선 안에 90% 미만인 부품:', worst.length);
console.log(worst.join(' | '));
const avg = rows.reduce((s, r) => s + r.insidePct, 0) / rows.length;
console.log('평균 내부 포함율 %:', avg.toFixed(1));
['Cho_T3_ㅎ', 'Jung_T2_ㅏ', 'Jong_T1_ㄴ', 'Cho_T1_ㄱ', 'Jung_T1_ㅡ', 'Jong_T2_ㄹ'].forEach(id => console.log(JSON.stringify(rows.find(r => r.id === id))));
console.log('실측 선폭(외곽선 안 중심선점 기준, 단위 em/1024) 전체 min/max:', Math.min(...rows.map(r => r.wMin)), Math.max(...rows.map(r => r.wMax)));
