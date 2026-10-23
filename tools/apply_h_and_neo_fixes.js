const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

// 1. In computeDynamicJamoBounds, handle vType === 'H' with and without hasJong
const oldH = `    if (vType === 'H' && hasJong) {
        let y1 = Math.round(minY + (maxY - minY) * 0.35);
        let min1 = 1e9;
        const r1Start = Math.round(minY + (maxY - minY) * 0.18);
        const r1End = Math.round(minY + (maxY - minY) * 0.48);
        for (let y = r1Start; y <= r1End; y++) {
            if (projY[y] < min1) { min1 = projY[y]; y1 = y; }
        }

        let y2 = Math.round(minY + (maxY - minY) * 0.65);
        let min2 = 1e9;
        const r2Start = Math.max(y1 + 5, Math.round(minY + (maxY - minY) * 0.48));
        const r2End = Math.round(minY + (maxY - minY) * 0.80);
        for (let y = r2Start; y <= r2End; y++) {
            if (projY[y] < min2) { min2 = projY[y]; y2 = y; }
        }

        b.choY1 = minY; b.choY2 = y1;
        b.jungY1 = y1; b.jungY2 = y2;
        b.jongY1 = y2; b.jongY2 = maxY;
    }`;

const newH = `    if (vType === 'H') {
        if (hasJong) {
            let y1 = Math.round(minY + (maxY - minY) * 0.35);
            let min1 = 1e9;
            const r1Start = Math.round(minY + (maxY - minY) * 0.18);
            const r1End = Math.round(minY + (maxY - minY) * 0.48);
            for (let y = r1Start; y <= r1End; y++) {
                if (projY[y] < min1) { min1 = projY[y]; y1 = y; }
            }

            let y2 = Math.round(minY + (maxY - minY) * 0.65);
            let min2 = 1e9;
            const r2Start = Math.max(y1 + 5, Math.round(minY + (maxY - minY) * 0.48));
            const r2End = Math.round(minY + (maxY - minY) * 0.80);
            for (let y = r2Start; y <= r2End; y++) {
                if (projY[y] < min2) { min2 = projY[y]; y2 = y; }
            }

            b.choY1 = minY; b.choY2 = y1;
            b.jungY1 = y1; b.jungY2 = y2;
            b.jongY1 = y2; b.jongY2 = maxY;
        } else {
            let y1 = Math.round(minY + (maxY - minY) * 0.48);
            let min1 = 1e9;
            const r1Start = Math.round(minY + (maxY - minY) * 0.30);
            const r1End = Math.round(minY + (maxY - minY) * 0.62);
            for (let y = r1Start; y <= r1End; y++) {
                if (projY[y] < min1) { min1 = projY[y]; y1 = y; }
            }
            b.choY1 = minY; b.choY2 = y1;
            b.jungY1 = y1; b.jungY2 = maxY;
        }
    }`;

// 2. In computeDynamicJamoBounds for vType === 'V', adjust xEnd limit
const oldVEnd = `const xEnd = Math.round(minX + (maxX - minX) * 0.75);`;
const newVEnd = `const xEnd = Math.round(minX + (maxX - minX) * (isDoubleCho ? 0.70 : 0.58));`;

// 3. In buildGlyphData, enforce partition wall for vType === 'H' whether hasJong or not
const oldBgdH = `                        if (jb.vType === 'H' && jb.hasJong) {
                            if (mk.part === 'cho' && ly > jb.choY2 + 3) dist += 1e7;
                            else if (mk.part === 'jung' && (ly < jb.jungY1 - 3 || ly > jb.jungY2 + 3)) dist += 1e7;
                            else if (mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                        }`;

const newBgdH = `                        if (jb.vType === 'H') {
                            if (mk.part === 'cho' && ly > jb.choY2 + 3) dist += 1e7;
                            else if (mk.part === 'jung') {
                                if (ly < jb.choY2 - 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.jungY2 + 3) dist += 1e7;
                            }
                            else if (jb.hasJong && mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                        }`;

let patched = html;

if (patched.includes(oldH)) {
    patched = patched.replace(oldH, newH);
    console.log('Patched H in computeDynamicJamoBounds');
} else console.log('Could not find oldH');

if (patched.includes(oldVEnd)) {
    patched = patched.replace(oldVEnd, newVEnd);
    console.log('Patched VEnd in computeDynamicJamoBounds');
} else console.log('Could not find oldVEnd');

if (patched.includes(oldBgdH)) {
    patched = patched.replace(oldBgdH, newBgdH);
    console.log('Patched BgdH in buildGlyphData');
} else console.log('Could not find oldBgdH');

fs.writeFileSync('index.html', patched.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully written index.html');
