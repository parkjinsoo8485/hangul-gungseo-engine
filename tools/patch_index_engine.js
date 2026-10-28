const fs = require('fs');
let s = fs.readFileSync('c:/한글획순/index.html', 'utf8');

// 1. In computeDynamicJamoBounds:
// Fix (a): In vType === 'V' with hasJong, set b.jungY2 = ySplit;
s = s.replace(
    "b.choY2 = ySplit;\n            b.jongY1 = ySplit; b.jongY2 = maxY;",
    "b.choY2 = ySplit;\n            b.jungY2 = ySplit;\n            b.jongY1 = ySplit; b.jongY2 = maxY;"
);

// Fix (b): In vType === 'C', find splitX without jumping past the vertical stem of jung_v!
const oldCSplit = `        const isDoubleV = (info.jung === 'ㅞ' || info.jung === 'ㅙ');
        let xSplit = Math.round(minX + (maxX - minX) * (isDoubleV ? 0.54 : 0.62));
        let minXVal = 1e9;
        const xStart = Math.round(minX + (maxX - minX) * (isDoubleV ? 0.50 : 0.52));
        const xEnd = Math.round(minX + (maxX - minX) * (isDoubleV ? 0.62 : 0.80));
        const yUpperC = hasJong ? Math.round(minY + (maxY - minY) * 0.52) : maxY;
        for (let x = xStart; x <= xEnd; x++) {
            let colSum = 0;
            for (let y = minY; y <= yUpperC; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) colSum++;
            }
            if (colSum < minXVal) { minXVal = colSum; xSplit = x; }
        }
        b.splitX = xSplit;`;

const newCSplit = `        // (1) splitX: 초성·가로모음(좌측)과 세로모음(우측) 사이의 수직 분할벽
        // 상단 절반(y <= 0.45*H)에서 우측 세로모음의 기둥 위치(stemX)를 먼저 찾고, 그 좌측의 최소 계곡을 splitX로 설정
        const Hc = maxY - minY;
        const yTopHalf = Math.round(minY + Hc * 0.45);
        let maxStemCol = -1, stemX = Math.round(minX + (maxX - minX) * 0.68);
        const stemScanStart = Math.round(minX + (maxX - minX) * 0.52);
        const stemScanEnd = Math.round(minX + (maxX - minX) * 0.90);
        for (let x = stemScanStart; x <= stemScanEnd; x++) {
            let sum = 0;
            for (let y = minY; y <= yTopHalf; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) sum++;
            }
            if (sum > maxStemCol) { maxStemCol = sum; stemX = x; }
        }
        let minXVal = 1e9, xSplit = Math.round(minX + (maxX - minX) * 0.56);
        const xStart = Math.round(minX + (maxX - minX) * 0.44);
        const xEnd = Math.max(xStart + 2, stemX - Math.max(3, Math.round(R * 0.02)));
        for (let x = xStart; x <= xEnd; x++) {
            let colSum = 0;
            for (let y = minY; y <= yTopHalf; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) colSum++;
            }
            if (colSum < minXVal) { minXVal = colSum; xSplit = x; }
        }
        b.splitX = xSplit;`;

s = s.replace(oldCSplit, newCSplit);

// Fix (c): In vType === 'C', find yBarC (the horizontal bar of ㅗ/ㅜ/ㅡ) and set choY2 & jung bounds
const oldCYCho = `        // (2) choY2: 초성(좌상)과 가로모음(좌중) 사이의 수평 분할벽
        const isUiOpen = (!hasJong && info.jung === 'ㅢ');
        const isTallCapCho = (info.cho === 'ㅎ' || info.cho === 'ㅊ');
        let yCho = Math.round(minY + (maxY - minY) * (isUiOpen ? 0.50 : (isTallCapCho && !hasJong ? 0.55 : 0.42)));
        let minYCho = 1e9;
        const ycStart = Math.round(minY + (maxY - minY) * (isUiOpen ? 0.40 : (isTallCapCho ? (hasJong ? 0.36 : 0.45) : 0.28)));
        const ycEnd = Math.round(minY + (maxY - minY) * (isUiOpen ? 0.56 : (hasJong ? (isTallCapCho ? 0.52 : 0.48) : (isTallCapCho ? 0.64 : 0.55))));
        for (let y = ycStart; y <= ycEnd; y++) {
            let rowLeft = 0;
            for (let x = minX; x <= xSplit; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) rowLeft++;
            }
            if (rowLeft < minYCho) { minYCho = rowLeft; yCho = y; }
        }
        let choYTop = R;
        const choRight = Math.round(minX + (maxX - minX) * 0.48);
        for (let y = minY; y <= yCho; y++) {
            for (let x = minX; x <= choRight; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                    if (y < choYTop) { choYTop = y; break; }
                }
            }
            if (choYTop < R) break;
        }
        b.choY1 = choYTop < R ? choYTop : minY;
        b.choY2 = yCho;
        b.jungY1 = yCho; b.jungY2 = maxY;

        // (3) jongY1: 가로모음과 종성(받침) 사이의 수평 분할벽 (가로모음 몸통 yBarC 아래 ~ 종성 상단 사이 탐색)
        if (hasJong) {
            const Hc = maxY - minY;
            let yBarC = Math.round(yCho + Hc * 0.12);
            let maxLeftBar = -1;
            const barCStart = Math.max(yCho + 2, Math.round(minY + Hc * 0.36));
            const barCEnd = Math.round(minY + Hc * 0.58);
            for (let y = barCStart; y <= barCEnd; y++) {
                let leftSum = 0;
                for (let x = minX; x <= xSplit; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) leftSum++;
                }
                if (leftSum > maxLeftBar) { maxLeftBar = leftSum; yBarC = y; }
            }
            let yJong = Math.round(minY + Hc * 0.62);
            let minYJong = 1e9;
            const yjStart = Math.max(yBarC + Math.max(3, Math.round(Hc * 0.05)), Math.round(minY + Hc * 0.54));
            const yjEnd = Math.max(yjStart + 2, Math.round(minY + Hc * 0.67));
            const lowThreshC = Math.max(3, Math.round(R * 0.025));
            const spikeThreshC = Math.max(8, Math.round(R * 0.08));
            for (let y = yjStart; y <= yjEnd; y++) {
                let rowSum = 0;
                for (let x = minX; x <= maxX; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) rowSum++;
                }
                if (rowSum < minYJong) { minYJong = rowSum; yJong = y; }
                else if (minYJong <= lowThreshC && rowSum >= minYJong + spikeThreshC) {
                    break;
                }
            }
            b.jungY2 = yJong;
            b.jongY1 = yJong; b.jongY2 = maxY;
        }`;

const newCYCho = `        // (2) yBarC: 가로모음(ㅗ/ㅜ/ㅡ)의 핵심 수평획 Y좌표를 좌측(x <= splitX - 2)에서 정밀 검출
        const isO = (info.jung === 'ㅘ' || info.jung === 'ㅙ' || info.jung === 'ㅚ');
        const isU = (info.jung === 'ㅝ' || info.jung === 'ㅞ' || info.jung === 'ㅟ');
        const isUi = (info.jung === 'ㅢ');

        const barSearchMin = Math.round(minY + Hc * (hasJong ? 0.38 : (isUi ? 0.48 : (isO ? 0.54 : 0.42))));
        const barSearchMax = Math.round(minY + Hc * (hasJong ? 0.62 : (isUi ? 0.68 : (isO ? 0.76 : 0.62))));
        let yBarC = Math.round((barSearchMin + barSearchMax) * 0.5), maxLeftBar = -1;
        for (let y = barSearchMin; y <= barSearchMax; y++) {
            let leftSum = 0;
            for (let x = minX; x <= xSplit - 2; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) leftSum++;
            }
            if (leftSum > maxLeftBar) { maxLeftBar = leftSum; yBarC = y; }
        }
        b.yBarC = yBarC;

        // (3) choY2: 초성 하단 경계
        // ㅗ(ㅘ, ㅙ, ㅚ)의 경우 세로 꼭지가 초성과 가로획 사이를 연결하므로 초성 하단은 yBarC 위쪽 꼭지 시작점 이전이어야 함
        const minGapAboveBar = Math.round(Hc * (isO ? (hasJong ? 0.08 : 0.12) : 0.05));
        const maxChoY = yBarC - minGapAboveBar;

        let yCho = maxChoY, minYCho = 1e9;
        const ycStart = Math.round(minY + Hc * (hasJong ? 0.32 : 0.38));
        const ycEnd = maxChoY;
        for (let y = ycStart; y <= ycEnd; y++) {
            let rowLeft = 0;
            for (let x = minX; x <= xSplit - 2; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) rowLeft++;
            }
            if (rowLeft < minYCho) { minYCho = rowLeft; yCho = y; }
        }

        let choYTop = R;
        const choRight = Math.round(minX + (maxX - minX) * 0.46);
        for (let y = minY; y <= yCho; y++) {
            for (let x = minX; x <= choRight; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                    if (y < choYTop) { choYTop = y; break; }
                }
            }
            if (choYTop < R) break;
        }
        b.choY1 = choYTop < R ? choYTop : minY;
        b.choY2 = yCho;
        b.jungY1 = yCho;
        b.jungY2 = hasJong ? maxY : Math.min(maxY, Math.round(yBarC + Hc * (isU ? 0.18 : 0.06)));

        // (4) jongY1: 가로모음과 종성(받침) 사이의 수평 분할벽
        if (hasJong) {
            let yJong = Math.round(minY + Hc * 0.64);
            let minYJong = 1e9;
            const yjStart = Math.max(yBarC + Math.max(3, Math.round(Hc * 0.05)), Math.round(minY + Hc * 0.54));
            const yjEnd = Math.max(yjStart + 2, Math.round(minY + Hc * 0.68));
            const lowThreshC = Math.max(3, Math.round(R * 0.025));
            const spikeThreshC = Math.max(8, Math.round(R * 0.08));
            for (let y = yjStart; y <= yjEnd; y++) {
                let rowSum = 0;
                for (let x = minX; x <= maxX; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) rowSum++;
                }
                if (rowSum < minYJong) { minYJong = rowSum; yJong = y; }
                else if (minYJong <= lowThreshC && rowSum >= minYJong + spikeThreshC) {
                    break;
                }
            }
            b.jungY2 = yJong;
            b.jongY1 = yJong; b.jongY2 = maxY;
        }`;

s = s.replace(oldCYCho, newCYCho);

// 2. In fitEntriesToGlyph:
// Adapt fbox for C-type choseong, jung_h, and jung_v cleanly!
const oldCFit = `                } else if (jb.vType === 'C') {
                    if (e.part === 'cho') {
                        if (jb.choY1) {
                            const actTop = jb.choY1 / s;
                            const diff = actTop - e.fbox[1];
                            e.fbox[1] = actTop;
                            if (jb.hasJong || diff > 0) {
                                e.fbox[3] = Math.max(12, e.fbox[3] - diff);
                            }
                        }
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        if (e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(12, choY2 - e.fbox[1]);
                    } else if (e.part === 'jung') {
                        if (jb.hasJong && ['ㅝ', 'ㅞ', 'ㅟ'].some(v => (e.whId || e.char || '').includes(v))) {
                            if (e.fbox[1] + e.fbox[3] < jongY1 - 1) {
                                e.fbox[3] = Math.max(e.fbox[3], jongY1 - 0.5 - e.fbox[1]);
                            }
                        } else if (jb.hasJong && ['ㅢ', 'ㅚ', 'ㅘ', 'ㅙ'].some(v => (e.whId || e.char || '').includes(v))) {
                            if (choY2 > 42 && e.fbox[1] + e.fbox[3] < jongY1 + 2) {
                                e.fbox[3] = Math.max(e.fbox[3], jongY1 + 2 - e.fbox[1]);
                            }
                        }
                        if (jb.hasJong && (e.whId || e.char || '').includes('ㅞ') && choY2 > 42) {
                            e.fbox[1] = Math.max(e.fbox[1], 14);
                        }
                    } else if (e.part === 'jong') {
                        if (e.fbox[1] < jongY1 - 1) {
                            const bot = e.fbox[1] + e.fbox[3];
                            e.fbox[1] = jongY1 - 1;
                            e.fbox[3] = Math.max(14, bot - e.fbox[1]);
                        }
                    }
                }`;

const newCFit = `                } else if (jb.vType === 'C') {
                    if (e.part === 'cho') {
                        const actTop = jb.choY1 / s;
                        e.fbox[1] = actTop;
                        // 초성 박스는 [actTop, choY2 - 0.5] 높이에 완벽히 적응
                        e.fbox[3] = Math.max(14, Math.min(42, (choY2 - 0.5) - actTop));
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                    } else if (e.part === 'jung') {
                        if (e.subPart === 'jung_h') {
                            const barY = (jb.yBarC ? jb.yBarC / s : 65);
                            const isO = ['ㅘ', 'ㅙ', 'ㅚ'].some(v => (e.whId || e.char || '').includes(v));
                            const isU = ['ㅝ', 'ㅞ', 'ㅟ'].some(v => (e.whId || e.char || '').includes(v));
                            if (isO) {
                                // ㅗ: 꼭지는 choY2 바로 아래서 시작하고, 가로획은 barY에 안착
                                e.fbox[1] = choY2 + 0.5;
                                e.fbox[3] = Math.max(9, (barY + 2.5) - e.fbox[1]);
                            } else if (isU) {
                                // ㅜ: 가로획은 barY 부근에서 시작하고 세로획은 아래로 연장
                                e.fbox[1] = Math.max(choY2 + 0.5, barY - 3.0);
                                const botLimit = jb.hasJong ? (jongY1 - 1.0) : Math.min(84, barY + 16);
                                e.fbox[3] = Math.max(12, botLimit - e.fbox[1]);
                            } else {
                                // ㅢ (ㅡ): barY에 단단히 안착
                                e.fbox[1] = barY - e.fbox[3] * 0.5;
                            }
                            if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(16, splitX - 0.5 - e.fbox[0]);
                        } else if (e.subPart === 'jung_v') {
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
                        }
                    } else if (e.part === 'jong') {
                        if (e.fbox[1] < jongY1 - 1) {
                            const bot = e.fbox[1] + e.fbox[3];
                            e.fbox[1] = jongY1 - 1;
                            e.fbox[3] = Math.max(14, bot - e.fbox[1]);
                        }
                    }
                }`;

s = s.replace(oldCFit, newCFit);

// Fix e.region filtering in fitEntriesToGlyph for C-type
const oldCRegion = `                    } else if (jb.vType === 'C') {
                        if (jb.hasJong && e.part === 'jong' && y < jongY1 - 3) return false;
                        if (e.part === 'cho') {
                            if (x > splitX + 3) return false;
                            if (jb.hasJong && y > jongY1 - 4) return false;
                        }
                    }`;

const newCRegion = `                    } else if (jb.vType === 'C') {
                        if (jb.hasJong && e.part === 'jong' && y < jongY1 - 3) return false;
                        if (e.part === 'cho') {
                            if (x > splitX + 2) return false;
                            if (y > choY2 + 2) return false;
                        } else if (e.part === 'jung') {
                            if (e.subPart === 'jung_h') {
                                if (x > splitX + 2) return false;
                                if (y < choY2 - 2) return false;
                                if (jb.hasJong && y > jongY1 + 2) return false;
                            } else if (e.subPart === 'jung_v') {
                                if (x < splitX - 6) return false;
                                if (jb.hasJong && y > jongY1 + 3) return false;
                            }
                        }
                    }`;

s = s.replace(oldCRegion, newCRegion);

// Fix coordinate descent wall constraints in fitEntriesToGlyph for C-type
const oldCSweep = `                                    } else if (jb.vType === 'C') {
                                        if (e.part === 'cho') {
                                            if (nb[0] + nb[2] > splitX - 0.5) continue;
                                            if (nb[1] + nb[3] > choY2 + 1) continue;
                                        } else if (e.part === 'jung') {
                                            if (nb[1] < 6) continue;
                                        } else if (e.part === 'jong') {
                                            if (nb[1] < jongY1 - 2) continue;
                                        }
                                    }`;

const newCSweep = `                                    } else if (jb.vType === 'C') {
                                        if (e.part === 'cho') {
                                            if (nb[0] + nb[2] > splitX - 0.5) continue;
                                            if (nb[1] + nb[3] > choY2 + 1) continue;
                                        } else if (e.part === 'jung') {
                                            if (e.subPart === 'jung_h') {
                                                if (nb[1] < choY2 - 2) continue;
                                                if (nb[0] + nb[2] > splitX + 1) continue;
                                                if (jb.hasJong && nb[1] + nb[3] > jongY1 + 2) continue;
                                            } else if (e.subPart === 'jung_v') {
                                                if (nb[0] < splitX - 4) continue;
                                                if (jb.hasJong && nb[1] + nb[3] > jongY1 + 3) continue;
                                            }
                                        } else if (e.part === 'jong') {
                                            if (nb[1] < jongY1 - 2) continue;
                                        }
                                    }`;

s = s.replace(oldCSweep, newCSweep);

// Fix per-stroke shift constraints in fitEntriesToGlyph for C-type
const oldCSc = `                        } else if (jb.vType === 'C') {
                            if (e.part === 'cho') {
                                if (maxSmpX + dx > splitX - 0.5) return 1e6;
                                if (maxSmpY + dy > choY2 + 1) return 1e6;
                            } else if (e.part === 'jung' && isCLeftJung) {
                                if (minSmpY + dy < choY2 - 2.5) return 1e6;
                                if (jb.hasJong && maxSmpY + dy > jongY1 + 2) return 1e6;
                            } else if (e.part === 'jong') {
                                if (minSmpY + dy < jongY1 - 2) return 1e6;
                            }
                        }`;

const newCSc = `                        } else if (jb.vType === 'C') {
                            if (e.part === 'cho') {
                                if (maxSmpX + dx > splitX - 0.5) return 1e6;
                                if (maxSmpY + dy > choY2 + 1) return 1e6;
                            } else if (e.part === 'jung') {
                                if (e.subPart === 'jung_h' || isCLeftJung) {
                                    if (minSmpY + dy < choY2 - 2.5) return 1e6;
                                    if (jb.hasJong && maxSmpY + dy > jongY1 + 2) return 1e6;
                                } else if (e.subPart === 'jung_v') {
                                    if (minSmpX + dx < splitX - 5) return 1e6;
                                    if (jb.hasJong && maxSmpY + dy > jongY1 + 3) return 1e6;
                                }
                            } else if (e.part === 'jong') {
                                if (minSmpY + dy < jongY1 - 2) return 1e6;
                            }
                        }`;

s = s.replace(oldCSc, newCSc);

fs.writeFileSync('c:/한글획순/index.html', s, 'utf8');
console.log('Successfully applied all C-type and dynamic bounds fixes to index.html!');
