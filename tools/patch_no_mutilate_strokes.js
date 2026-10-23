const fs = require('fs');
let s = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

const oldTrimming = `                for (let j = checkStart; j < work.length; j++) {
                    if (work[j][1] > yEndLimit100 + 0.25) {
                        iEnd = Math.max(iStart + 3, j - 1);
                        break;
                    }
                    if (!onInk[j] && (j + 1 >= work.length || !onInk[j + 1] || isSingleSegWork || (meta.hasJong && meta.part !== 'jong' && work[j][1] > 48))) {
                        iEnd = Math.max(iStart + 3, j - 1);
                        break;
                    }
                }
                while (iEnd > checkStart && !onInk[iEnd]) iEnd--;

                const sliced = work.slice(iStart, iEnd + 1);
                if (sliced.length >= 4) {`;

const newTrimming = `                for (let j = checkStart; j < work.length; j++) {
                    if (work[j][1] > yEndLimit100 + 0.25) {
                        iEnd = Math.max(iStart + 3, j - 1);
                        break;
                    }
                    // 종성 침범 방지 트리밍은 오직 종성이 있을 때 중성 하향 획에만 적용
                    if (meta.part === 'jung' && meta.hasJong && work[j][1] > 48 && !onInk[j]) {
                        iEnd = Math.max(iStart + 3, j - 1);
                        break;
                    }
                }
                while (iEnd > checkStart && meta.part === 'jung' && !onInk[iEnd]) iEnd--;

                const sliced = work.slice(iStart, iEnd + 1);
                if (sliced.length >= Math.max(4, Math.floor(work.length * 0.70))) {`;

if (s.includes(oldTrimming)) {
    s = s.replace(oldTrimming, newTrimming);
    console.log('Replaced oldTrimming (LF)');
} else if (s.includes(oldTrimming.replace(/\n/g, '\r\n'))) {
    s = s.replace(oldTrimming.replace(/\n/g, '\r\n'), newTrimming.replace(/\n/g, '\r\n'));
    console.log('Replaced oldTrimming (CRLF)');
} else {
    console.log('oldTrimming not found');
}

fs.writeFileSync('c:/project/한글획순/index.html', s, 'utf8');
console.log('Saved index.html no-mutilate patch!');
