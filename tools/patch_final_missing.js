const fs = require('fs');
let s = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

// 1. computeDynamicJamoBounds 내 쌍자음 xStart 개선
const oldV = `    } else if (vType === 'V') {
        let xSplit = Math.round(minX + (maxX - minX) * 0.55);
        let minXVal = 1e9;
        const xStart = Math.round(minX + (maxX - minX) * 0.35);
        const xEnd = Math.round(minX + (maxX - minX) * 0.75);
        for (let x = xStart; x <= xEnd; x++) {
            if (projX[x] < minXVal) { minXVal = projX[x]; xSplit = x; }
        }
        b.splitX = xSplit;`;

const newV = `    } else if (vType === 'V') {
        let xSplit = Math.round(minX + (maxX - minX) * 0.55);
        let minXVal = 1e9;
        const isDoubleCho = (info.cho === 'ㅃ' || info.cho === 'ㅉ' || info.cho === 'ㄲ' || info.cho === 'ㄸ' || info.cho === 'ㅆ');
        const xStart = Math.round(minX + (maxX - minX) * (isDoubleCho ? 0.46 : 0.35));
        const xEnd = Math.round(minX + (maxX - minX) * 0.75);
        for (let x = xStart; x <= xEnd; x++) {
            if (projX[x] < minXVal) { minXVal = projX[x]; xSplit = x; }
        }
        b.splitX = xSplit;`;

if (s.includes(oldV)) {
    s = s.replace(oldV, newV);
    console.log('Replaced oldV (LF)');
} else if (s.includes(oldV.replace(/\n/g, '\r\n'))) {
    s = s.replace(oldV.replace(/\n/g, '\r\n'), newV.replace(/\n/g, '\r\n'));
    console.log('Replaced oldV (CRLF)');
} else {
    console.log('oldV not found');
}

// 2. buildGlyphData 내의 penalty for jung_v 수정 (오직 세로획에만 좌측 침범 차단 적용)
const oldVPenalty = `                            } else if (mk.part === 'jung') {
                                if (lx < jb.splitX - 3 && ly > 80) dist += 1e7;
                                if (jb.hasJong && strokeEndLy[sId] < 1e5 && ly > strokeEndLy[sId] + 3) dist += 1e7;
                            }`;

const newVPenalty = `                            } else if (mk.part === 'jung') {
                                const isVert = Math.abs(pty[starts[k]]) > 0.72;
                                if (isVert && lx < jb.splitX - 3 && ly > 80) dist += 1e7;
                                if (jb.hasJong && strokeEndLy[sId] < 1e5 && ly > strokeEndLy[sId] + 3) dist += 1e7;
                            }`;

if (s.includes(oldVPenalty)) {
    s = s.replace(oldVPenalty, newVPenalty);
    console.log('Replaced oldVPenalty (LF)');
} else if (s.includes(oldVPenalty.replace(/\n/g, '\r\n'))) {
    s = s.replace(oldVPenalty.replace(/\n/g, '\r\n'), newVPenalty.replace(/\n/g, '\r\n'));
    console.log('Replaced oldVPenalty (CRLF)');
} else {
    console.log('oldVPenalty not found');
}

fs.writeFileSync('c:/project/한글획순/index.html', s, 'utf8');
console.log('Saved index.html final missing patch!');
