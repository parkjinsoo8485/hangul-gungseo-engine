const fs = require('fs');

const report = JSON.parse(fs.readFileSync('tools/harness_21_vowels_report.json', 'utf8'));
console.log('=== Empty Strokes in 820 Report ===');
console.log(report.anomalies.filter(a => a.type === 'EMPTY_STROKE_ANOMALY'));

console.log('\n=== Low Ink Ratios in 820 Report (Grouped by whId) ===');
const byWh = {};
for (const a of report.anomalies.filter(x => x.type === 'LOW_INK_RATIO')) {
    if (!byWh[a.whId]) byWh[a.whId] = [];
    byWh[a.whId].push({ ch: a.ch, stroke: a.stroke, ratio: +a.onInkRatio.toFixed(2) });
}
for (const [k, v] of Object.entries(byWh)) {
    console.log(k, `(${v.length} cases):`, v.slice(0, 6));
}

const whCode = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const win = {};
new Function('window', whCode)(win);
const parts = win.HANGUL_WH_CENTERLINES.parts;

const CHOS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'];
console.log('\n=== Warehouse Cho Parts Summary ===');
for (const c of CHOS) {
    const info = [1, 2, 3].map(t => {
        const p = parts[`Cho_T${t}_${c}`];
        if (!p) return `T${t}:MISSING`;
        const dirs = p.m.map((st, idx) => {
            const dx = st[st.length - 1][0] - st[0][0];
            const dy = st[st.length - 1][1] - st[0][1];
            return `#${idx + 1}(pts=${st.length},dx=${Math.round(dx)},dy=${Math.round(dy)})`;
        }).join(' ');
        return `T${t}[${p.m.length}st: ${dirs}]`;
    }).join(' | ');
    console.log(`${c}: ${info}`);
}
