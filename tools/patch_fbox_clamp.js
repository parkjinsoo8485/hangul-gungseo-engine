const fs = require('fs');
let s = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

const oldBlock = `        this.jamoEntries.forEach(e => {
            e.fbox = [...e.box];
            e.def = [...e.box];
            // 자소 박스 안에서 실제 잉크가 있어야 할 영역(초성·중성·종성 경계 준수) 내 잉크 점 수집
            const cell = cells[e.ci];
            const jb = fitDynBounds[e.ci];
            const choY2 = jb ? jb.choY2 / s : ((e.vType === 'H') ? 38 : 54);
            const jungY1 = jb ? jb.jungY1 / s : 35;
            const jungY2 = jb ? jb.jungY2 / s : ((e.jongChar === 'ㄴ') ? 69 : 59);
            const jongY1 = jb ? jb.jongY1 / s : 54;
            const splitX = jb ? jb.splitX / s : 55;`;

const newBlock = `        this.jamoEntries.forEach(e => {
            e.fbox = [...e.box];
            const cell = cells[e.ci];
            const jb = fitDynBounds[e.ci];
            const choY2 = jb ? jb.choY2 / s : ((e.vType === 'H') ? 38 : 54);
            const jungY1 = jb ? jb.jungY1 / s : 35;
            const jungY2 = jb ? jb.jungY2 / s : ((e.jongChar === 'ㄴ') ? 69 : 59);
            const jongY1 = jb ? jb.jongY1 / s : 54;
            const splitX = jb ? jb.splitX / s : 55;

            // ★ 자소 박스를 실제 글리프의 동적 분할벽(Partition Walls)에 맞게 초기 적응
            if (jb) {
                if (jb.vType === 'V') {
                    if (e.part === 'cho') {
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        if (jb.hasJong && e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(14, choY2 - e.fbox[1]);
                    } else if (e.part === 'jung') {
                        if (e.fbox[0] < splitX + 0.5) {
                            const right = e.fbox[0] + e.fbox[2];
                            e.fbox[0] = splitX + 0.5;
                            e.fbox[2] = Math.max(14, right - e.fbox[0]);
                        }
                    } else if (e.part === 'jong') {
                        if (e.fbox[1] < jongY1 - 0.5) {
                            const bot = e.fbox[1] + e.fbox[3];
                            e.fbox[1] = jongY1 - 0.5;
                            e.fbox[3] = Math.max(14, bot - e.fbox[1]);
                        }
                    }
                } else if (jb.vType === 'H') {
                    if (e.part === 'cho') {
                        if (jb.hasJong && e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(12, choY2 - e.fbox[1]);
                    } else if (e.part === 'jung') {
                        if (jb.hasJong) {
                            if (e.fbox[1] < choY2 - 1) e.fbox[1] = choY2 - 1;
                            if (e.fbox[1] + e.fbox[3] > jongY1 + 1) e.fbox[3] = Math.max(10, jongY1 + 1 - e.fbox[1]);
                        }
                    } else if (e.part === 'jong') {
                        if (e.fbox[1] < jongY1 - 1) {
                            const bot = e.fbox[1] + e.fbox[3];
                            e.fbox[1] = jongY1 - 1;
                            e.fbox[3] = Math.max(14, bot - e.fbox[1]);
                        }
                    }
                } else if (jb.vType === 'C') {
                    if (e.part === 'cho') {
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        if (e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(12, choY2 - e.fbox[1]);
                    } else if (e.part === 'jong') {
                        if (e.fbox[1] < jongY1 - 1) {
                            const bot = e.fbox[1] + e.fbox[3];
                            e.fbox[1] = jongY1 - 1;
                            e.fbox[3] = Math.max(14, bot - e.fbox[1]);
                        }
                    }
                }
            }
            e.def = [...e.fbox];
            // 자소 박스 안에서 실제 잉크가 있어야 할 영역(초성·중성·종성 경계 준수) 내 잉크 점 수집`;

if (s.includes(oldBlock)) {
    s = s.replace(oldBlock, newBlock);
    console.log('Replaced oldBlock (LF)');
} else if (s.includes(oldBlock.replace(/\n/g, '\r\n'))) {
    s = s.replace(oldBlock.replace(/\n/g, '\r\n'), newBlock.replace(/\n/g, '\r\n'));
    console.log('Replaced oldBlock (CRLF)');
} else {
    console.log('oldBlock not found');
}

fs.writeFileSync('c:/project/한글획순/index.html', s, 'utf8');
console.log('Saved index.html fbox clamp!');
