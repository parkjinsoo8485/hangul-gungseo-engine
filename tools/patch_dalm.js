const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target1 = `                            // ★ 이중모음 사이 가로획: 첫 번째 기둥 좌측으로 역방향 관통 차단
                            if (meta.part === 'jung' && Math.abs(dx) > Math.abs(dy) * 1.5) {
                                if ((first[0] - ci * 100) >= firstStemX - 1.0) {
                                    if (lx100 < firstStemX - 0.2) break;
                                }
                            }
                            if (meta.part === 'jung' && meta.subPart === 'jung_v') {
                                const isDoubleV = ['ㅐ', 'ㅔ', 'ㅒ', 'ㅖ', 'ㅙ', 'ㅞ'].some(v => (meta.whId || '').includes(v));
                                const leftLimit = isDoubleV ? (splitX + 0.5) : (splitX - 1.0);
                                if (lx100 < leftLimit) break;
                            }
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'V') && lx100 > splitX - 0.5) break;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'H') && sy > choY2 + 0.5) break;
                            if (meta.part === 'cho' && first[4] === 'D' && sy < first[1] - 0.2) break;
                            const lx = lx100 * R / 100, ly = sy * R / 100;
                            if (alphaAt(ci, lx, ly) < 96) break;
                            const rw = perpRunAt(ci, lx, ly, nx, ny);
                            if (rw > refW * 1.75) break;
                            pre.unshift([sx, sy, first[2], 0.0, first[4], first[5], first[6], first[7]]);
                        }
                        if (pre.length) sliced.unshift(...pre);`;

const repl1 = `                            // ★ 이중모음 사이 가로획 및 세로모음 우측 곁점: 첫 번째 기둥 좌측으로 역방향 관통 원천 차단
                            if (meta.part === 'jung' && Math.abs(dx) > Math.abs(dy) * 1.5) {
                                if (lx100 < firstStemX - 0.2) break;
                            }
                            if (meta.part === 'jung' && meta.subPart === 'jung_v') {
                                const isDoubleV = ['ㅐ', 'ㅔ', 'ㅒ', 'ㅖ', 'ㅙ', 'ㅞ'].some(v => (meta.whId || '').includes(v));
                                const leftLimit = isDoubleV ? (splitX + 0.5) : (splitX - 1.0);
                                if (lx100 < leftLimit) break;
                            }
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'V') && lx100 > splitX - 0.5) break;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'H') && sy > choY2 + 0.5) break;
                            if (meta.part === 'cho' && first[4] === 'D' && sy < first[1] - 0.2) break;
                            const lx = lx100 * R / 100, ly = sy * R / 100;
                            if (alphaAt(ci, lx, ly) < 96) break;
                            const rw = perpRunAt(ci, lx, ly, nx, ny);
                            if (rw > refW * 1.75) break;
                            pre.unshift([sx, sy, first[2], 0.0, first[4], first[5], first[6], first[7]]);
                        }
                        if (pre.length) sliced.unshift(...pre);

                        // ★ 세로모음의 우측 곁점(ㅏ, ㅑ, ㅐ, ㅒ 등): 시작점이 세로기둥 좌측(초성 영역)으로 넘어가지 않도록 보정
                        const isRightTickJung = meta.part === 'jung' && ['ㅏ', 'ㅑ', 'ㅐ', 'ㅒ'].some(v => (meta.whId || '').includes(v));
                        if (isRightTickJung && sliced.length > 0) {
                            const minStart = firstStemX - 0.2;
                            while (sliced.length > 4 && (sliced[0][0] - ci * 100) < minStart) {
                                sliced.shift();
                            }
                        }`;

// Target 2: Extend Cho bottom horizontal stroke to firstStemX - 0.5
const target2 = `                        for (let step = 1.0; step <= 13.0; step += 1.0) {
                            const ex = last[0] + tx * step, ey = last[1] + ty * step;
                            if (ey > yEndLimit100) break;
                            const lx100 = ex - ci * 100;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'V') && lx100 > splitX - 0.5) break;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'H') && ey > choY2 + 0.5) break;
                            // ★ ㅓ/ㅕ 곁점 및 이중모음 가로획: 세로 기둥 너머로 관통하지 못하도록 상한 차단
                            if (meta.part === 'jung' && isLastH) {
                                if ((sliced[0][0] - ci * 100) < firstStemX - 0.5) {
                                    if (lx100 > firstStemX + 0.2) break;
                                } else if (stemXList.length >= 2) {
                                    if (lx100 > stemXList[1] + 0.2) break;
                                }
                            }
                            const maxJungHRight = (jb && jb.stemX_C) ? (jb.stemX_C * 100 / R + 0.5) : (splitX + 2.0);
                            if (meta.part === 'jung' && meta.subPart === 'jung_h' && lx100 > maxJungHRight) break;
                            if (meta.part === 'jung' && meta.subPart === 'jung_v') {
                                const isDoubleV = ['ㅐ', 'ㅔ', 'ㅒ', 'ㅖ', 'ㅙ', 'ㅞ'].some(v => (meta.whId || '').includes(v));
                                const leftLimit = isDoubleV ? (splitX + 0.5) : (splitX - 1.0);
                                if (lx100 < leftLimit) break;
                            }
                            if (meta.part === 'jong' && ey < jongY1 - 0.5) break;
                            if (meta.part === 'jong' && isLastH) {
                                const maxJongRight = (jb && jb.maxX) ? (jb.maxX * 100 / R + 0.2) : 88;
                                if (lx100 > maxJongRight) break;
                            }
                            const maxJungVBot = (jb && jb.stemBotY_U && isLastV) ? (jb.stemBotY_U * 100 / R + 0.5) : (jongY1 - 0.5);
                            if (meta.part === 'jung' && meta.hasJong && ey > maxJungVBot) break;
                            if (isLastH && meta.part === 'cho') {
                                const maxChoHRight = (meta.vType === 'C' || meta.vType === 'V') ? (splitX - 0.2) : 62.2;
                                if (lx100 > maxChoHRight) break;
                            }`;

const repl2 = `                        const isChoBottomH = (meta.part === 'cho' && isLastH && (meta.vType === 'V') && last[1] > 36 && ['ㄷ', 'ㅌ', 'ㄹ'].some(c => (meta.whId || '').includes(c)));
                        const maxSteps = isChoBottomH ? 18.0 : 13.0;
                        for (let step = 1.0; step <= maxSteps; step += 1.0) {
                            const ex = last[0] + tx * step, ey = last[1] + ty * step;
                            if (ey > yEndLimit100) break;
                            const lx100 = ex - ci * 100;
                            if (meta.part === 'cho') {
                                if (isChoBottomH) {
                                    if (lx100 > firstStemX - 0.5) break;
                                } else if ((meta.vType === 'C' || meta.vType === 'V') && lx100 > splitX - 0.5) {
                                    break;
                                }
                            }
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'H') && ey > choY2 + 0.5) break;
                            // ★ ㅓ/ㅕ 곁점 및 이중모음 가로획: 세로 기둥 너머로 관통하지 못하도록 상한 차단
                            if (meta.part === 'jung' && isLastH) {
                                if ((sliced[0][0] - ci * 100) < firstStemX - 0.5) {
                                    if (lx100 > firstStemX + 0.2) break;
                                } else if (stemXList.length >= 2) {
                                    if (lx100 > stemXList[1] + 0.2) break;
                                }
                            }
                            const maxJungHRight = (jb && jb.stemX_C) ? (jb.stemX_C * 100 / R + 0.5) : (splitX + 2.0);
                            if (meta.part === 'jung' && meta.subPart === 'jung_h' && lx100 > maxJungHRight) break;
                            if (meta.part === 'jung' && meta.subPart === 'jung_v') {
                                const isDoubleV = ['ㅐ', 'ㅔ', 'ㅒ', 'ㅖ', 'ㅙ', 'ㅞ'].some(v => (meta.whId || '').includes(v));
                                const leftLimit = isDoubleV ? (splitX + 0.5) : (splitX - 1.0);
                                if (lx100 < leftLimit) break;
                            }
                            if (meta.part === 'jong' && ey < jongY1 - 0.5) break;
                            if (meta.part === 'jong' && isLastH) {
                                const maxJongRight = (jb && jb.maxX) ? (jb.maxX * 100 / R + 0.2) : 88;
                                if (lx100 > maxJongRight) break;
                            }
                            const maxJungVBot = (jb && jb.stemBotY_U && isLastV) ? (jb.stemBotY_U * 100 / R + 0.5) : (jongY1 - 0.5);
                            if (meta.part === 'jung' && meta.hasJong && ey > maxJungVBot) break;
                            if (isLastH && meta.part === 'cho') {
                                const maxChoHRight = isChoBottomH ? (firstStemX - 0.5) : ((meta.vType === 'C' || meta.vType === 'V') ? (splitX - 0.2) : 62.2);
                                if (lx100 > maxChoHRight) break;
                            }`;

const normCode = code.replace(/\r?\n/g, '\n');
const normT1 = target1.replace(/\r?\n/g, '\n');
const normT2 = target2.replace(/\r?\n/g, '\n');
const normR1 = repl1.replace(/\r?\n/g, '\n');
const normR2 = repl2.replace(/\r?\n/g, '\n');

if (!normCode.includes(normT1)) {
    console.error('Target 1 not found!');
    process.exit(1);
}
if (!normCode.includes(normT2)) {
    console.error('Target 2 not found!');
    process.exit(1);
}

let patched = normCode.replace(normT1, normR1).replace(normT2, normR2);

// Also bump cache-buster
patched = patched.replace(/warehouse_centerlines\.js\?v=[0-9_]+/g, 'warehouse_centerlines.js?v=20261029_1120');

fs.writeFileSync('index.html', patched, 'utf8');
console.log('Successfully applied patches to index.html');
