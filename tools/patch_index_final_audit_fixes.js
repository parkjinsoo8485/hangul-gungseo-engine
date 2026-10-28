const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. In computeDynamicJamoBounds for V-type: compute b.jongX1 and b.jongX2
const targetV = `        b.splitX = xSplit;

        let choYTop = R;`;

const replV = `        b.splitX = xSplit;

        if (hasJong) {
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
        }

        let choYTop = R;`;

if (!html.includes(targetV)) {
    console.error('Target V not found!');
    process.exit(1);
}
html = html.replace(targetV, replV);

// 2. In fitEntriesToGlyph for V-type jong: center fbox horizontally at b.jongX1/b.jongX2
const targetJongV = `                    } else if (e.part === 'jong') {
                        if (e.fbox[1] < jongY1 - 0.5) {
                            const bot = e.fbox[1] + e.fbox[3];
                            e.fbox[1] = jongY1 - 0.5;
                            e.fbox[3] = Math.max(14, bot - e.fbox[1]);
                        }
                    }`;

const replJongV = `                    } else if (e.part === 'jong') {
                        if (e.fbox[1] < jongY1 - 0.5) {
                            const bot = e.fbox[1] + e.fbox[3];
                            e.fbox[1] = jongY1 - 0.5;
                            e.fbox[3] = Math.max(14, bot - e.fbox[1]);
                        }
                        if (jb.jongX1 !== undefined && jb.jongX2 !== undefined) {
                            const actLeft = jb.jongX1 / s;
                            const actRight = jb.jongX2 / s;
                            const actMidX = (actLeft + actRight) * 0.5;
                            const actW = Math.max(16, actRight - actLeft);
                            const fitW = Math.max(actW, e.fbox[2]);
                            e.fbox[0] = Math.max(actLeft - 1.0, actMidX - fitW * 0.5);
                            e.fbox[2] = fitW;
                        }
                    }`;

if (!html.includes(targetJongV)) {
    console.error('Target JongV not found!');
    process.exit(1);
}
html = html.replace(targetJongV, replJongV);

// 3. In fitEntriesToGlyph for C-type jung_v: prevent crushing e.fbox[2] and support isLeftTick
const targetJungVC = `                        } else if (e.subPart === 'jung_v') {
                            // 세로모음(ㅏ/ㅐ/ㅣ/ㅓ/ㅔ): splitX 우측 전체 영역
                            const jungLeftWall = splitX + 0.5;
                            if (e.fbox[0] < jungLeftWall) {
                                const right = e.fbox[0] + e.fbox[2];
                                e.fbox[0] = jungLeftWall;
                                e.fbox[2] = Math.max(12, right - e.fbox[0]);
                            }
                            if (jb.hasJong && e.fbox[1] + e.fbox[3] > jongY1 + 1.5) {
                                e.fbox[3] = Math.max(25, jongY1 + 1.0 - e.fbox[1]);
                            }
                        }`;

const replJungVC = `                        } else if (e.subPart === 'jung_v') {
                            // 세로모음(ㅏ/ㅐ/ㅣ/ㅓ/ㅔ): splitX 우측 전체 영역
                            const isLeftTick = ['ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅞ', 'ㅙ'].some(v => (e.whId || e.char || '').includes(v));
                            const jungLeftWall = isLeftTick ? splitX - 3.0 : splitX + 0.5;
                            const actMaxX = jb.maxX / s;
                            if (e.fbox[0] < jungLeftWall) {
                                e.fbox[0] = jungLeftWall;
                            }
                            const targetRight = Math.max(e.fbox[0] + e.fbox[2], actMaxX + 1.0);
                            e.fbox[2] = Math.max(14, targetRight - e.fbox[0]);
                            if (jb.hasJong && e.fbox[1] + e.fbox[3] > jongY1 + 1.5) {
                                e.fbox[3] = Math.max(25, jongY1 + 1.0 - e.fbox[1]);
                            }
                        }`;

if (!html.includes(targetJungVC)) {
    console.error('Target JungVC not found!');
    process.exit(1);
}
html = html.replace(targetJungVC, replJungVC);

// 4. In forward extension (d): prevent downward stroke of jung from extending into jong
const targetExtD = `                            if (meta.part === 'jong' && ey < jongY1 - 0.5) break;`;

const replExtD = `                            if (meta.part === 'jong' && ey < jongY1 - 0.5) break;
                            if (meta.part === 'jung' && meta.hasJong && ey > jongY1 - 0.5) break;`;

if (!html.includes(targetExtD)) {
    console.error('Target ExtD not found!');
    process.exit(1);
}
html = html.replace(targetExtD, replExtD);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully applied final audit fixes to index.html!');
