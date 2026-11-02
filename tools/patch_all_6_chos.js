const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target1 = `                        const isChoBottomH = (meta.part === 'cho' && isLastH && (meta.vType === 'V') && last[1] > 36 && ['ㄷ', 'ㅌ', 'ㄹ'].some(c => (meta.whId || '').includes(c)));
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
                            }
                            const lx = lx100 * R / 100, ly = ey * R / 100;
                            if (alphaAt(ci, lx, ly) < 64) break;
                            const rw = perpRunAt(ci, lx, ly, nx, ny);
                            if (rw > refW * (isLastH ? 1.65 : 1.80)) break;
                            sliced.push([ex, ey, last[2], 1.0, last[4], last[5], last[6], last[7]]);
                        }`;

const repl1 = `                        const isChoBottomH = (meta.part === 'cho' && isLastH && (meta.vType === 'V') && last[1] > 35 && ['ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅌ', 'ㅍ'].some(c => (meta.whId || '').includes(c)));
                        const maxSteps = isChoBottomH ? 22.0 : 13.0;
                        let curEy = last[1];
                        for (let step = 1.0; step <= maxSteps; step += 1.0) {
                            const ex = last[0] + tx * step;
                            let ey = isChoBottomH ? (curEy + ty * 1.0) : (last[1] + ty * step);
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
                            }
                            const lx = lx100 * R / 100;
                            let ly = ey * R / 100;
                            if (isChoBottomH) {
                                // 앙세(우상향) 곡률을 따라 먹물 중심 Y를 미세 추적
                                let sumY = 0, cntY = 0;
                                for (let dyPx = -6; dyPx <= 6; dyPx++) {
                                    if (alphaAt(ci, lx, ly + dyPx) >= 80) { sumY += (ly + dyPx); cntY++; }
                                }
                                if (cntY > 0) {
                                    ly = sumY / cntY;
                                    ey = ly * 100 / R;
                                }
                            }
                            if (alphaAt(ci, lx, ly) < 64) break;
                            const rw = perpRunAt(ci, lx, ly, nx, ny);
                            if (!isChoBottomH && rw > refW * (isLastH ? 1.65 : 1.80)) break;
                            curEy = ey;
                            sliced.push([ex, ey, last[2], 1.0, last[4], last[5], last[6], last[7]]);
                        }`;

const target2 = `                        } else if (jb.vType === 'V') {
                            const isChoConnBottom = ['ㄷ', 'ㅌ', 'ㄹ'].some(c => (mk.whId || (metaK[0] && metaK[0].whId) || '').includes(c)) && ly >= (jb.choY1 + (jb.choY2 - jb.choY1) * 0.45);
                            if (mk.part === 'cho') {
                                const maxChoX = isChoConnBottom ? (jb.stemX_V ? jb.stemX_V - 2 : jb.splitX + 45) : (jb.splitX + 3);
                                const allowBottom = !jb.hasJong && ly > (jb.choY1 + (jb.choY2 - jb.choY1) * 0.55);
                                if (lx > maxChoX && !allowBottom) dist += 1e7;
                                if (jb.hasJong && ly > jb.choY2 + 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                const choHasConn = ['ㄷ', 'ㅌ', 'ㄹ'].some(c => (metaK[0] && metaK[0].whId || '').includes(c));
                                if (choHasConn && isChoConnBottom && lx < (jb.stemX_V ? jb.stemX_V - 3 : jb.splitX + 35)) {
                                    dist += 1e7; // 중성이 초성 ㄷ/ㅌ/ㄹ의 하단 가로 주간선을 침범하는 것을 차단
                                }`;

const repl2 = `                        } else if (jb.vType === 'V') {
                            const isChoConnBottom = ['ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅌ', 'ㅍ'].some(c => (mk.whId || (metaK[0] && metaK[0].whId) || '').includes(c)) && ly >= (jb.choY1 + (jb.choY2 - jb.choY1) * 0.45);
                            if (mk.part === 'cho') {
                                const maxChoX = isChoConnBottom ? (jb.stemX_V ? jb.stemX_V - 2 : jb.splitX + 45) : (jb.splitX + 3);
                                const allowBottom = !jb.hasJong && ly > (jb.choY1 + (jb.choY2 - jb.choY1) * 0.55);
                                if (lx > maxChoX && !allowBottom) dist += 1e7;
                                if (jb.hasJong && ly > jb.choY2 + 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                const choHasConn = ['ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅌ', 'ㅍ'].some(c => (metaK[0] && metaK[0].whId || '').includes(c));
                                if (choHasConn && isChoConnBottom && lx < (jb.stemX_V ? jb.stemX_V - 3 : jb.splitX + 35)) {
                                    dist += 1e7; // 중성이 초성 ㄴ/ㄷ/ㄸ/ㄹ/ㅌ/ㅍ의 하단 가로 주간선을 침범하는 것을 차단
                                }`;

const normCode = code.replace(/\r?\n/g, '\n');
const normT1 = target1.replace(/\r?\n/g, '\n');
const normR1 = repl1.replace(/\r?\n/g, '\n');
const normT2 = target2.replace(/\r?\n/g, '\n');
const normR2 = repl2.replace(/\r?\n/g, '\n');

if (!normCode.includes(normT1)) { console.error('T1 not found'); process.exit(1); }
if (!normCode.includes(normT2)) { console.error('T2 not found'); process.exit(1); }

let patched = normCode.replace(normT1, normR1).replace(normT2, normR2);
patched = patched.replace(/warehouse_centerlines\.js\?v=[0-9_]+/g, 'warehouse_centerlines.js?v=20261029_1140');
fs.writeFileSync('index.html', patched, 'utf8');
console.log('Successfully patched all 6 bottom-bar cho consonants in index.html');
