const fs = require('fs');
let s = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

const oldC = `    } else if (vType === 'C') {
        let xSplit = Math.round(minX + (maxX - minX) * 0.52);
        let minXVal = 1e9;
        for (let x = Math.round(minX + (maxX - minX) * 0.35); x <= Math.round(minX + (maxX - minX) * 0.70); x++) {
            if (projX[x] < minXVal) { minXVal = projX[x]; xSplit = x; }
        }
        b.splitX = xSplit;

        if (hasJong) {
            let y2 = Math.round(minY + (maxY - minY) * 0.65);
            let min2 = 1e9;
            for (let y = Math.round(minY + (maxY - minY) * 0.48); y <= Math.round(minY + (maxY - minY) * 0.80); y++) {
                if (projY[y] < min2) { min2 = projY[y]; y2 = y; }
            }
            b.jongY1 = y2; b.jongY2 = maxY;
        }
    }`;

const newC = `    } else if (vType === 'C') {
        // C형 복합모음(ㅘ, ㅙ, ㅚ, ㅝ, ㅞ, ㅟ, ㅢ): 초성(좌상단) + 가로모음(중좌단) + 세로모음(우측전체) + 받침(하단)
        // (1) splitX: 초성·가로모음(좌측)과 세로모음(우측) 사이의 수직 분할벽 (52%~78% 범위 탐색)
        let xSplit = Math.round(minX + (maxX - minX) * 0.62);
        let minXVal = 1e9;
        const xStart = Math.round(minX + (maxX - minX) * 0.50);
        const xEnd = Math.round(minX + (maxX - minX) * 0.82);
        for (let x = xStart; x <= xEnd; x++) {
            if (projX[x] < minXVal) { minXVal = projX[x]; xSplit = x; }
        }
        b.splitX = xSplit;

        // (2) choY2: 초성(좌상)과 가로모음(좌중) 사이의 수평 분할벽 (30%~55% 범위 탐색)
        let yCho = Math.round(minY + (maxY - minY) * 0.42);
        let minYCho = 1e9;
        const ycStart = Math.round(minY + (maxY - minY) * 0.28);
        const ycEnd = Math.round(minY + (maxY - minY) * 0.55);
        for (let y = ycStart; y <= ycEnd; y++) {
            let rowLeft = 0;
            for (let x = minX; x <= xSplit; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) rowLeft++;
            }
            if (rowLeft < minYCho) { minYCho = rowLeft; yCho = y; }
        }
        b.choY1 = minY; b.choY2 = yCho;
        b.jungY1 = yCho; b.jungY2 = maxY;

        // (3) jongY1: 가로모음과 종성(받침) 사이의 수평 분할벽 (55%~80% 범위 탐색)
        if (hasJong) {
            let yJong = Math.round(minY + (maxY - minY) * 0.66);
            let minYJong = 1e9;
            const yjStart = Math.max(yCho + 5, Math.round(minY + (maxY - minY) * 0.52));
            const yjEnd = Math.round(minY + (maxY - minY) * 0.82);
            for (let y = yjStart; y <= yjEnd; y++) {
                let rowSum = 0;
                for (let x = minX; x <= maxX; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) rowSum++;
                }
                if (rowSum < minYJong) { minYJong = rowSum; yJong = y; }
            }
            b.jungY2 = yJong;
            b.jongY1 = yJong; b.jongY2 = maxY;
        }
    }`;

if (s.includes(oldC)) {
    s = s.replace(oldC, newC);
    console.log('Replaced oldC (LF)');
} else if (s.includes(oldC.replace(/\n/g, '\r\n'))) {
    s = s.replace(oldC.replace(/\n/g, '\r\n'), newC.replace(/\n/g, '\r\n'));
    console.log('Replaced oldC (CRLF)');
} else {
    console.log('oldC not found');
}

// 2. buildGlyphData 내의 penalty for C 수정
const oldCPenalty = `                        } else if (jb.vType === 'C') {
                            if (jb.hasJong && mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (jb.hasJong && ly > (jb.jongY1 || R) - 15) dist += 1e7;
                            }
                        }`;

const newCPenalty = `                        } else if (jb.vType === 'C') {
                            if (jb.hasJong && mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (ly > jb.choY2 + 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                if (lx < jb.splitX - 3 && ly < jb.choY2 - 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.jongY1 + 3 && lx < jb.splitX) dist += 1e7;
                            }
                        }`;

if (s.includes(oldCPenalty)) {
    s = s.replace(oldCPenalty, newCPenalty);
    console.log('Replaced oldCPenalty (LF)');
} else if (s.includes(oldCPenalty.replace(/\n/g, '\r\n'))) {
    s = s.replace(oldCPenalty.replace(/\n/g, '\r\n'), newCPenalty.replace(/\n/g, '\r\n'));
    console.log('Replaced oldCPenalty (CRLF)');
} else {
    console.log('oldCPenalty not found');
}

fs.writeFileSync('c:/project/한글획순/index.html', s, 'utf8');
console.log('Updated C vowel logic!');
