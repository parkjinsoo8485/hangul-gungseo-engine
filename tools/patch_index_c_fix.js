const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. In computeDynamicJamoBounds for C type:
const target1 = `        const Hc = maxY - minY;
        const yTopHalf = Math.round(minY + Hc * 0.45);
        let maxStemCol = -1, stemX = Math.round(minX + (maxX - minX) * 0.68);
        const stemScanStart = Math.round(minX + (maxX - minX) * 0.52);
        const stemScanEnd = Math.round(minX + (maxX - minX) * 0.90);
        for (let x = stemScanStart; x <= stemScanEnd; x++) {
            let sum = 0;
            for (let y = minY; y <= yTopHalf; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) sum++;
            }
            if (sum > maxStemCol) { maxStemCol = sum; stemX = x; }
        }
        let minXVal = 1e9, xSplit = Math.round(minX + (maxX - minX) * 0.56);
        const xStart = Math.round(minX + (maxX - minX) * 0.44);
        const xEnd = Math.max(xStart + 2, stemX - Math.max(3, Math.round(R * 0.02)));
        for (let x = xStart; x <= xEnd; x++) {
            let colSum = 0;
            for (let y = minY; y <= yTopHalf; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) colSum++;
            }
            if (colSum < minXVal) { minXVal = colSum; xSplit = x; }
        }
        b.splitX = xSplit;`;

const repl1 = `        const Hc = maxY - minY;
        const yTopHalf = Math.round(minY + Hc * 0.45);
        let maxStemCol = -1, stemX = Math.round(minX + (maxX - minX) * 0.75);
        const stemScanStart = Math.round(minX + (maxX - minX) * 0.58);
        const stemScanEnd = maxX;
        for (let x = stemScanStart; x <= stemScanEnd; x++) {
            let sum = 0;
            for (let y = minY; y <= yTopHalf; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) sum++;
            }
            if (sum > maxStemCol) { maxStemCol = sum; stemX = x; }
        }
        let minXVal = 1e9, xSplit = stemX - Math.max(4, Math.round(R * 0.03));
        const xStart = Math.round(minX + (maxX - minX) * 0.45);
        const xEnd = stemX - Math.max(3, Math.round(R * 0.02));
        for (let x = xEnd; x >= xStart; x--) {
            let colSum = 0;
            for (let y = minY; y <= yTopHalf; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) colSum++;
            }
            if (colSum < minXVal) { minXVal = colSum; xSplit = x; }
            if (colSum === 0) break;
        }
        b.splitX = xSplit;

        let choX1 = R, choX2 = 0;
        for (let y = minY; y <= yTopHalf; y++) {
            for (let x = minX; x <= xSplit; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                    if (x < choX1) choX1 = x;
                    if (x > choX2) choX2 = x;
                }
            }
        }
        if (choX1 < choX2) { b.choX1 = choX1; b.choX2 = choX2; }`;

if (!html.includes(target1)) {
    console.error('Target 1 not found!');
    process.exit(1);
}
html = html.replace(target1, repl1);

// 2. In fitEntriesToGlyph for C type cho centering:
const target2 = `                } else if (jb.vType === 'C') {
                    if (e.part === 'cho') {
                        const actTop = jb.choY1 / s;
                        e.fbox[1] = actTop;
                        // 초성 박스는 [actTop, choY2 - 0.5] 높이에 완벽히 적응
                        e.fbox[3] = Math.max(14, Math.min(42, (choY2 - 0.5) - actTop));
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                    } else if (e.part === 'jung') {`;

const repl2 = `                } else if (jb.vType === 'C') {
                    if (e.part === 'cho') {
                        const actTop = jb.choY1 / s;
                        e.fbox[1] = actTop;
                        // 초성 박스는 [actTop, choY2 - 0.5] 높이에 완벽히 적응
                        e.fbox[3] = Math.max(14, Math.min(42, (choY2 - 0.5) - actTop));
                        if (jb.choX1 !== undefined && jb.choX2 !== undefined) {
                            const actLeft = jb.choX1 / s;
                            const actRight = jb.choX2 / s;
                            const actW = Math.max(16, actRight - actLeft);
                            const midX = (actLeft + actRight) * 0.5;
                            const fitW = Math.max(18, Math.min(splitX - 1.0 - actLeft, Math.max(actW, e.fbox[2])));
                            e.fbox[0] = Math.max(actLeft - 1.0, midX - fitW * 0.5);
                            e.fbox[2] = fitW;
                            if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        } else {
                            if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        }
                    } else if (e.part === 'jung') {`;

if (!html.includes(target2)) {
    console.error('Target 2 not found!');
    process.exit(1);
}
html = html.replace(target2, repl2);

// 3. In lines 3175-3215 backward/forward extension boundary limits:
const target3 = `                        for (let step = 1.1; step <= 7.5; step += 1.1) {
                            const sx = first[0] + tx * step, sy = first[1] + ty * step;
                            if (meta.part === 'jong' && sy < 53) break;
                            const lx = (sx - ci * 100) * R / 100, ly = sy * R / 100;
                            if (alphaAt(ci, lx, ly) < 96) break;
                            const rw = perpRunAt(ci, lx, ly, nx, ny);
                            if (rw > refW * 1.75) break;
                            pre.unshift([sx, sy, first[2], 0.0, first[4], first[5], first[6], first[7]]);
                        }`;

const repl3 = `                        const jb = dynBounds[ci];
                        const choY2 = jb ? jb.choY2 * 100 / R : 52;
                        const jongY1 = jb ? jb.jongY1 * 100 / R : 56;
                        const splitX = jb ? jb.splitX * 100 / R : 55;
                        for (let step = 1.1; step <= 7.5; step += 1.1) {
                            const sx = first[0] + tx * step, sy = first[1] + ty * step;
                            const lx100 = sx - ci * 100;
                            if (meta.part === 'jong' && sy < jongY1 - 0.5) break;
                            if (meta.part === 'jung' && meta.subPart === 'jung_h' && sy < choY2 - 0.5) break;
                            if (meta.part === 'jung' && meta.subPart === 'jung_v' && lx100 < splitX - 1.0) break;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'V') && lx100 > splitX - 0.5) break;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'H') && sy > choY2 + 0.5) break;
                            const lx = lx100 * R / 100, ly = sy * R / 100;
                            if (alphaAt(ci, lx, ly) < 96) break;
                            const rw = perpRunAt(ci, lx, ly, nx, ny);
                            if (rw > refW * 1.75) break;
                            pre.unshift([sx, sy, first[2], 0.0, first[4], first[5], first[6], first[7]]);
                        }`;

if (!html.includes(target3)) {
    console.error('Target 3 not found!');
    process.exit(1);
}
html = html.replace(target3, repl3);

const target4 = `                        for (let step = 1.0; step <= 13.0; step += 1.0) {
                            const ex = last[0] + tx * step, ey = last[1] + ty * step;
                            if (ey > yEndLimit100) break;
                            if (isLastH && meta.part === 'cho' && meta.vType !== 'H' && (ex - ci * 100) > 62.2) break;
                            const lx = (ex - ci * 100) * R / 100, ly = ey * R / 100;
                            if (alphaAt(ci, lx, ly) < 64) break;
                            const rw = perpRunAt(ci, lx, ly, nx, ny);
                            if (rw > refW * (isLastH ? 1.65 : 1.80)) break;
                            sliced.push([ex, ey, last[2], 1.0, last[4], last[5], last[6], last[7]]);
                        }`;

const repl4 = `                        const jb = dynBounds[ci];
                        const choY2 = jb ? jb.choY2 * 100 / R : 52;
                        const jongY1 = jb ? jb.jongY1 * 100 / R : 56;
                        const splitX = jb ? jb.splitX * 100 / R : 55;
                        for (let step = 1.0; step <= 13.0; step += 1.0) {
                            const ex = last[0] + tx * step, ey = last[1] + ty * step;
                            if (ey > yEndLimit100) break;
                            const lx100 = ex - ci * 100;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'V') && lx100 > splitX - 0.5) break;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'H') && ey > choY2 + 0.5) break;
                            if (meta.part === 'jung' && meta.subPart === 'jung_h' && lx100 > splitX + 2.0) break;
                            if (meta.part === 'jung' && meta.subPart === 'jung_v' && lx100 < splitX - 1.0) break;
                            if (meta.part === 'jong' && ey < jongY1 - 0.5) break;
                            if (isLastH && meta.part === 'cho' && meta.vType !== 'H' && lx100 > 62.2) break;
                            const lx = lx100 * R / 100, ly = ey * R / 100;
                            if (alphaAt(ci, lx, ly) < 64) break;
                            const rw = perpRunAt(ci, lx, ly, nx, ny);
                            if (rw > refW * (isLastH ? 1.65 : 1.80)) break;
                            sliced.push([ex, ey, last[2], 1.0, last[4], last[5], last[6], last[7]]);
                        }`;

if (!html.includes(target4)) {
    console.error('Target 4 not found!');
    process.exit(1);
}
html = html.replace(target4, repl4);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully patched index.html with C-type precision fixes!');
