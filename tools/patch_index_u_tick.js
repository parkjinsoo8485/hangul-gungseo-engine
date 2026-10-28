const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. In computeDynamicJamoBounds for H type:
const targetH = `            b.choY1 = minY; b.choY2 = y1;
            b.jungY1 = y1; b.jungY2 = y2;
            b.jongY1 = y2; b.jongY2 = maxY;
        }`;

const replH = `            b.choY1 = minY; b.choY2 = y1;
            b.jungY1 = y1; b.jungY2 = y2;
            b.jongY1 = y2; b.jongY2 = maxY;

            if (info.jung === 'ㅜ' || info.jung === 'ㅠ') {
                let maxUCol = -1, stemX_U = Math.round((minX + maxX) * 0.5);
                const uScanStart = Math.round(minX + (maxX - minX) * 0.35);
                const uScanEnd = Math.round(minX + (maxX - minX) * 0.85);
                const yUTop = yBar + Math.max(2, Math.round(H * 0.03));
                const yUBot = b.jongY1 - Math.max(2, Math.round(H * 0.02));
                for (let x = uScanStart; x <= uScanEnd; x++) {
                    let sum = 0;
                    for (let y = yUTop; y <= yUBot; y++) {
                        if (img[(y * W + ci * R + x) * 4 + 3] > 50) sum++;
                    }
                    if (sum > maxUCol) { maxUCol = sum; stemX_U = x; }
                }
                if (maxUCol >= 3) {
                    b.stemX_U = stemX_U;
                }
            }
        }`;

if (!html.includes(targetH)) {
    console.error('Target H not found!');
    process.exit(1);
}
html = html.replace(targetH, replH);

// 2. In entriesToRaw:
const targetRaw = `                const isVertJungTick = (e.part === 'jung' && spanX < 1.5 && spanY > 4.0);
                const maxShiftX = isVertJungTick ? 1.0 : Math.min(4.2, Math.max(2.5, strokeSpan * 0.45));
                const maxShiftY = isCLeftJung ? 7.5 : Math.min(4.2, Math.max(2.5, strokeSpan * 0.45));`;

const replRaw = `                const isVertJungTick = (e.part === 'jung' && spanX < 1.5 && spanY > 4.0);
                const maxShiftX = isVertJungTick ? 1.0 : Math.min(4.2, Math.max(2.5, strokeSpan * 0.45));
                const maxShiftY = isCLeftJung ? 7.5 : Math.min(4.2, Math.max(2.5, strokeSpan * 0.45));
                let forceShiftX = null;
                if (isVertJungTick && jb && jb.stemX_U !== undefined) {
                    forceShiftX = (jb.stemX_U / s) - (b[0] + st[0][0] * b[2]);
                }`;

if (!html.includes(targetRaw)) {
    console.error('Target Raw not found!');
    process.exit(1);
}
html = html.replace(targetRaw, replRaw);

const targetCur = `                let best = sc(0, 0), cur = [0, 0];`;
const replCur = `                let best = sc(0, 0), cur = (forceShiftX !== null) ? [forceShiftX, 0] : [0, 0];`;

if (!html.includes(targetCur)) {
    console.error('Target Cur not found!');
    process.exit(1);
}
html = html.replace(targetCur, replCur);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully patched index.html with stemX_U alignment!');
