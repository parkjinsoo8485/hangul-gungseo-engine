const fs = require('fs');
const vm = require('vm');
const txt = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const s = { window: {} };
vm.runInNewContext(txt, s);
const parts = s.window.HANGUL_WH_CENTERLINES.parts;

const issues = [];

for (const [id, p] of Object.entries(parts)) {
    const strokes = p.m;

    // Check double batchims (e.g. ㄳ, ㄵ, ㄶ, ㄺ, ㄻ, ㄼ, ㄽ, ㄾ, ㄿ, ㅀ, ㅄ)
    // Left part should have lower average X than right part!
    const complexJongs = {
        'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
        'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'],
        'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'],
        'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ']
    };

    if (complexJongs[p.c]) {
        const [leftChar, rightChar] = complexJongs[p.c];
        // measure avgX of each stroke
        const avgXs = strokes.map((st, i) => {
            const xs = st.map(pt => pt[0]);
            return { i: i + 1, x: xs.reduce((a, b) => a + b, 0) / xs.length };
        });
        // Check if later strokes are further left than earlier strokes
        for (let i = 0; i < avgXs.length - 1; i++) {
            if (avgXs[i].x > avgXs[i + 1].x + 120) {
                issues.push({ id, issue: 'Double batchim X-order reversed', i: i + 1, nextI: i + 2, x1: avgXs[i].x, x2: avgXs[i + 1].x });
            }
        }
    }

    // Check double cho (ㄲ, ㄸ, ㅃ, ㅆ, ㅉ)
    if (['ㄲ', 'ㄸ', 'ㅃ', 'ㅆ', 'ㅉ'].includes(p.c)) {
        const avgXs = strokes.map((st, i) => {
            const xs = st.map(pt => pt[0]);
            return { i: i + 1, x: xs.reduce((a, b) => a + b, 0) / xs.length };
        });
        // for twin consonants, first half should be left, second half should be right
        const half = Math.floor(strokes.length / 2);
        const leftAvgX = avgXs.slice(0, half).reduce((a, b) => a + b.x, 0) / half;
        const rightAvgX = avgXs.slice(half).reduce((a, b) => a + b.x, 0) / (strokes.length - half);
        if (leftAvgX > rightAvgX) {
            issues.push({ id, issue: 'Twin consonant left/right reversed', leftAvgX, rightAvgX });
        }
    }
}

console.log('Issues found in complex jamos:', issues.length);
console.log(JSON.stringify(issues, null, 2));
