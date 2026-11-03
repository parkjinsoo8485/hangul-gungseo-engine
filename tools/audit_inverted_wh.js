const fs = require('fs');
const vm = require('vm');
const txt = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const s = { window: {} };
vm.runInNewContext(txt, s);
const parts = s.window.HANGUL_WH_CENTERLINES.parts;

const report = [];

for (const [id, p] of Object.entries(parts)) {
    const strokes = p.m;
    if (strokes.length <= 1) continue;

    // Check ㄹ (should be top -> middle -> bottom)
    if (p.c === 'ㄹ') {
        const avgYs = strokes.map((st, i) => {
            const ys = st.map(pt => pt[1]);
            return { i: i + 1, y: ys.reduce((a, b) => a + b, 0) / ys.length };
        });
        // In HanziWriter, y goes up. So top stroke has highest y!
        // Should be: st 1 highest y, st 2 middle y, st 3 lowest y!
        if (avgYs[0].y < avgYs[avgYs.length - 1].y) {
            report.push({ id, issue: 'ㄹ stroke order inverted (drawn bottom-to-top)', avgYs });
        }
    }

    // Check ㅌ (should be top bar -> middle bar -> bottom L)
    if (p.c === 'ㅌ') {
        const avgYs = strokes.map((st, i) => {
            const ys = st.map(pt => pt[1]);
            return { i: i + 1, y: ys.reduce((a, b) => a + b, 0) / ys.length };
        });
        if (avgYs[0].y < avgYs[1].y) {
            report.push({ id, issue: 'ㅌ stroke order inverted', avgYs });
        }
    }

    // Check ㅎ (hat dot -> shoulder -> circle)
    if (p.c === 'ㅎ') {
        const avgYs = strokes.map((st, i) => {
            const ys = st.map(pt => pt[1]);
            return { i: i + 1, y: ys.reduce((a, b) => a + b, 0) / ys.length };
        });
        if (avgYs[0].y < avgYs[1].y || avgYs[1].y < avgYs[2].y) {
            report.push({ id, issue: 'ㅎ stroke order inverted', avgYs });
        }
    }
}

console.log('Inverted parts found:', report.length);
console.log(JSON.stringify(report, null, 2));
