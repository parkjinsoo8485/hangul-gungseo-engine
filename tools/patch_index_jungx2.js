const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. In computeDynamicJamoBounds for V-type: compute b.jungX2 in y in [minY, ySplit]
const targetVScan = `        if (hasJong) {
            let jLeft = R, jRight = 0;
            for (let y = ySplit; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                        if (x < jLeft) jLeft = x;
                        if (x > jRight) jRight = x;
                    }
                }
            }
            if (jLeft < jRight) { b.jongX1 = jLeft; b.jongX2 = jRight; }
        }`;

const replVScan = `        if (hasJong) {
            let jLeft = R, jRight = 0;
            for (let y = ySplit; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                        if (x < jLeft) jLeft = x;
                        if (x > jRight) jRight = x;
                    }
                }
            }
            if (jLeft < jRight) { b.jongX1 = jLeft; b.jongX2 = jRight; }

            let jungX2 = 0;
            for (let y = minY; y <= ySplit; y++) {
                for (let x = xSplit; x <= maxX; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                        if (x > jungX2) jungX2 = x;
                    }
                }
            }
            if (jungX2 > 0) b.jungX2 = jungX2;
        }`;

if (!html.includes(targetVScan)) {
    console.error('Target VScan not found!');
    process.exit(1);
}
html = html.replace(targetVScan, replVScan);

// 2. In fitEntriesToGlyph for V-type jung: use b.jungX2 if available
const targetActMaxX = `                        const actMaxX = jb.maxX / s;
                        const targetRight = Math.max(e.fbox[0] + 14, Math.min(e.fbox[0] + e.fbox[2], actMaxX + 0.5));
                        e.fbox[2] = Math.max(14, targetRight - e.fbox[0]);`;

const replActMaxX = `                        const actMaxX = (jb.hasJong && jb.jungX2 ? jb.jungX2 : jb.maxX) / s;
                        const targetRight = Math.max(e.fbox[0] + 14, Math.min(e.fbox[0] + e.fbox[2], actMaxX + 0.5));
                        e.fbox[2] = Math.max(14, targetRight - e.fbox[0]);`;

if (!html.includes(targetActMaxX)) {
    console.error('Target ActMaxX not found!');
    process.exit(1);
}
html = html.replace(targetActMaxX, replActMaxX);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully patched jungX2 detection in index.html!');
