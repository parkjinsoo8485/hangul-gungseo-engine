const fs = require('fs');
let s = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

// 1. sweep 교체
const oldSweep = `        for (let round = 0; round < 2; round++) {
            this.jamoEntries.forEach(e => {
                let best = cost(e, e.fbox);
                const jungYMax = (e.jongChar === 'ㄴ') ? 69 : 60;
                const choYMax = (e.vType === 'H') ? 39 : 54;
                const minScale = (e.part === 'jong') ? 0.55 : 0.72;
                [6, 3, 1.5, 0.75].forEach(step => {
                    for (let sweep = 0; sweep < 3; sweep++) {
                        let improved = false;
                        for (let p = 0; p < 4; p++) {
                            for (const sg of [-1, 1]) {
                                const nb = [...e.fbox];
                                nb[p] += sg * step * (p >= 2 ? 1.5 : 1);
                                if (p < 2 && Math.abs(nb[p] - e.def[p]) > 12) continue;
                                if (p >= 2 && (nb[p] < e.def[p] * minScale || nb[p] > e.def[p] * 1.18)) continue;
                                if (e.hasJong) {
                                    if (e.part === 'jung' && nb[1] + nb[3] > jungYMax) continue;
                                    if (e.part === 'cho' && nb[1] + nb[3] > choYMax) continue;
                                    if (e.part === 'jong' && nb[1] < 53) continue;
                                }
                                const c = cost(e, nb);
                                if (c < best - 1e-4) { best = c; e.fbox = nb; improved = true; }
                            }
                        }
                        if (!improved) break;
                    }
                });
            });
        }`;

const newSweep = `        for (let round = 0; round < 2; round++) {
            this.jamoEntries.forEach(e => {
                let best = cost(e, e.fbox);
                const jb = fitDynBounds[e.ci];
                const choY2 = jb ? jb.choY2 / s : ((e.vType === 'H') ? 39 : 54);
                const jungY1 = jb ? jb.jungY1 / s : 35;
                const jungY2 = jb ? jb.jungY2 / s : ((e.jongChar === 'ㄴ') ? 69 : 60);
                const jongY1 = jb ? jb.jongY1 / s : 54;
                const splitX = jb ? jb.splitX / s : 55;
                const minScale = (e.part === 'jong') ? 0.55 : 0.72;
                [6, 3, 1.5, 0.75].forEach(step => {
                    for (let sweep = 0; sweep < 3; sweep++) {
                        let improved = false;
                        for (let p = 0; p < 4; p++) {
                            for (const sg of [-1, 1]) {
                                const nb = [...e.fbox];
                                nb[p] += sg * step * (p >= 2 ? 1.5 : 1);
                                if (p < 2 && Math.abs(nb[p] - e.def[p]) > 12) continue;
                                if (p >= 2 && (nb[p] < e.def[p] * minScale || nb[p] > e.def[p] * 1.18)) continue;
                                if (jb) {
                                    if (jb.vType === 'V') {
                                        if (e.part === 'cho') {
                                            if (nb[0] + nb[2] > splitX - 0.5) continue;
                                            if (jb.hasJong && nb[1] + nb[3] > choY2 + 1) continue;
                                        } else if (e.part === 'jung') {
                                            if (nb[0] < splitX - 1) continue;
                                        } else if (e.part === 'jong') {
                                            if (nb[1] < jongY1 - 2) continue;
                                        }
                                    } else if (jb.vType === 'H') {
                                        if (e.part === 'cho') {
                                            if (jb.hasJong && nb[1] + nb[3] > choY2 + 1) continue;
                                        } else if (e.part === 'jung') {
                                            if (jb.hasJong && (nb[1] < choY2 - 2 || nb[1] + nb[3] > jongY1 + 2)) continue;
                                        } else if (e.part === 'jong') {
                                            if (nb[1] < jongY1 - 2) continue;
                                        }
                                    } else if (jb.vType === 'C') {
                                        if (e.part === 'cho') {
                                            if (nb[0] + nb[2] > splitX - 0.5) continue;
                                            if (nb[1] + nb[3] > choY2 + 1) continue;
                                        } else if (e.part === 'jong') {
                                            if (nb[1] < jongY1 - 2) continue;
                                        }
                                    }
                                }
                                const c = cost(e, nb);
                                if (c < best - 1e-4) { best = c; e.fbox = nb; improved = true; }
                            }
                        }
                        if (!improved) break;
                    }
                });
            });
        }`;

if (s.includes(oldSweep)) {
    s = s.replace(oldSweep, newSweep);
    console.log('Replaced oldSweep (LF)');
} else if (s.includes(oldSweep.replace(/\n/g, '\r\n'))) {
    s = s.replace(oldSweep.replace(/\n/g, '\r\n'), newSweep.replace(/\n/g, '\r\n'));
    console.log('Replaced oldSweep (CRLF)');
} else {
    console.log('oldSweep not found');
}

// 2. sc 교체
const oldScBlock = `                let minSmpY = 100, maxSmpY = 0;
                for (let i = 0; i < st.length - 1; i++) {
                    const ax = st[i][0] * b[2], ay = st[i][1] * b[3], bx2 = st[i + 1][0] * b[2], by2 = st[i + 1][1] * b[3];
                    const len = Math.hypot(bx2 - ax, by2 - ay) || 1;
                    const nx = -(by2 - ay) / len, ny = (bx2 - ax) / len;
                    for (let t = 0; t < 5; t++) {
                        const f = t / 5;
                        const sx = b[0] + ax * (1 - f) + bx2 * f, sy = b[1] + ay * (1 - f) + by2 * f;
                        if (sy < minSmpY) minSmpY = sy;
                        if (sy > maxSmpY) maxSmpY = sy;
                        samples.push([sx, sy, nx, ny]);
                    }
                }
                if (!samples.length) return;
                const occ = occArr[e.ci] || (occArr[e.ci] = []);
                const isVertSt = Math.abs(st[st.length - 1][1] - st[0][1]) > Math.abs(st[st.length - 1][0] - st[0][0]);
                const maxShiftX = (e.part === 'cho' && e.vType === 'H') ? 6 : (e.part === 'jung' && isVertSt ? 18 : 10);
                const maxShiftY = (e.part === 'cho' && e.vType === 'H') ? 4 : (e.part === 'jung' && !isVertSt ? 16 : 10);
                const sc = (dx, dy) => {
                    if (e.hasJong) {
                        if (e.part === 'jung' && maxSmpY + dy > jungYMax) return 1e6;
                        if (e.part === 'cho' && maxSmpY + dy > choYMax) return 1e6;
                        if (e.part === 'jong' && minSmpY + dy < 53) return 1e6;
                    }`;

const newScBlock = `                let minSmpX = 100, maxSmpX = 0, minSmpY = 100, maxSmpY = 0;
                for (let i = 0; i < st.length - 1; i++) {
                    const ax = st[i][0] * b[2], ay = st[i][1] * b[3], bx2 = st[i + 1][0] * b[2], by2 = st[i + 1][1] * b[3];
                    const len = Math.hypot(bx2 - ax, by2 - ay) || 1;
                    const nx = -(by2 - ay) / len, ny = (bx2 - ax) / len;
                    for (let t = 0; t < 5; t++) {
                        const f = t / 5;
                        const sx = b[0] + ax * (1 - f) + bx2 * f, sy = b[1] + ay * (1 - f) + by2 * f;
                        if (sx < minSmpX) minSmpX = sx;
                        if (sx > maxSmpX) maxSmpX = sx;
                        if (sy < minSmpY) minSmpY = sy;
                        if (sy > maxSmpY) maxSmpY = sy;
                        samples.push([sx, sy, nx, ny]);
                    }
                }
                if (!samples.length) return;
                const occ = occArr[e.ci] || (occArr[e.ci] = []);
                const isVertSt = Math.abs(st[st.length - 1][1] - st[0][1]) > Math.abs(st[st.length - 1][0] - st[0][0]);
                const maxShiftX = (e.part === 'cho' && e.vType === 'H') ? 6 : (e.part === 'jung' && isVertSt ? 18 : 10);
                const maxShiftY = (e.part === 'cho' && e.vType === 'H') ? 4 : (e.part === 'jung' && !isVertSt ? 16 : 10);
                const jb = fitDynBounds[e.ci];
                const choY2 = jb ? jb.choY2 / s : ((e.vType === 'H') ? 39.5 : 55);
                const jungY1 = jb ? jb.jungY1 / s : 35;
                const jungY2 = jb ? jb.jungY2 / s : ((e.jongChar === 'ㄴ') ? 70 : 61);
                const jongY1 = jb ? jb.jongY1 / s : 54;
                const splitX = jb ? jb.splitX / s : 55;
                const sc = (dx, dy) => {
                    if (jb) {
                        if (jb.vType === 'V') {
                            if (e.part === 'cho') {
                                if (maxSmpX + dx > splitX - 0.5) return 1e6;
                                if (jb.hasJong && maxSmpY + dy > choY2 + 1) return 1e6;
                            } else if (e.part === 'jung') {
                                if (minSmpX + dx < splitX - 1) return 1e6;
                            } else if (e.part === 'jong') {
                                if (minSmpY + dy < jongY1 - 2) return 1e6;
                            }
                        } else if (jb.vType === 'H') {
                            if (e.part === 'cho') {
                                if (jb.hasJong && maxSmpY + dy > choY2 + 1) return 1e6;
                            } else if (e.part === 'jung') {
                                if (jb.hasJong && (minSmpY + dy < choY2 - 2 || maxSmpY + dy > jongY1 + 2)) return 1e6;
                            } else if (e.part === 'jong') {
                                if (minSmpY + dy < jongY1 - 2) return 1e6;
                            }
                        } else if (jb.vType === 'C') {
                            if (e.part === 'cho') {
                                if (maxSmpX + dx > splitX - 0.5) return 1e6;
                                if (maxSmpY + dy > choY2 + 1) return 1e6;
                            } else if (e.part === 'jong') {
                                if (minSmpY + dy < jongY1 - 2) return 1e6;
                            }
                        }
                    }`;

if (s.includes(oldScBlock)) {
    s = s.replace(oldScBlock, newScBlock);
    console.log('Replaced oldScBlock (LF)');
} else if (s.includes(oldScBlock.replace(/\n/g, '\r\n'))) {
    s = s.replace(oldScBlock.replace(/\n/g, '\r\n'), newScBlock.replace(/\n/g, '\r\n'));
    console.log('Replaced oldScBlock (CRLF)');
} else {
    console.log('oldScBlock not found');
}

fs.writeFileSync('c:/project/한글획순/index.html', s, 'utf8');
console.log('Successfully patched sweep and sc!');
