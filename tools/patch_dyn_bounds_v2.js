const fs = require('fs');

// 원본 index.html에서 복사
let content = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

const helperCode = `
/**
 * 실제 폰트 글리프의 잉크 투영(Histogram)으로부터 초성·중성·종성의 수학적 분할벽(Partition Walls)을 동적 도출
 */
function computeDynamicJamoBounds(img, ci, count, R, info, vType, hasJong) {
    const W = R * count;
    const projY = new Float32Array(R);
    const projX = new Float32Array(R);
    let minY = R, maxY = 0, minX = R, maxX = 0;

    for (let y = 0; y < R; y++) {
        for (let lx = 0; lx < R; lx++) {
            const gx = ci * R + lx;
            const a = img[(y * W + gx) * 4 + 3];
            if (a > 50) {
                projY[y] += 1;
                projX[lx] += 1;
                if (lx < minX) minX = lx;
                if (lx > maxX) maxX = lx;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (minY >= maxY) return null;

    const b = {
        minX, maxX, minY, maxY, vType, hasJong,
        choY1: minY, choY2: maxY,
        jungY1: minY, jungY2: maxY,
        jongY1: minY, jongY2: maxY,
        splitX: Math.round((minX + maxX) * 0.5)
    };

    if (vType === 'H' && hasJong) {
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
    } else if (vType === 'V') {
        let xSplit = Math.round(minX + (maxX - minX) * 0.55);
        let minXVal = 1e9;
        const xStart = Math.round(minX + (maxX - minX) * 0.35);
        const xEnd = Math.round(minX + (maxX - minX) * 0.75);
        for (let x = xStart; x <= xEnd; x++) {
            if (projX[x] < minXVal) { minXVal = projX[x]; xSplit = x; }
        }
        b.splitX = xSplit;

        if (hasJong) {
            let ySplit = Math.round(minY + (maxY - minY) * 0.58);
            let minYVal = 1e9;
            const yStart = Math.round(minY + (maxY - minY) * 0.40);
            const yEnd = Math.round(minY + (maxY - minY) * 0.78);
            for (let y = yStart; y <= yEnd; y++) {
                let rowSum = 0;
                for (let x = minX; x <= xSplit; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) rowSum++;
                }
                if (rowSum < minYVal) { minYVal = rowSum; ySplit = y; }
            }
            b.choY1 = minY; b.choY2 = ySplit;
            b.jongY1 = ySplit; b.jongY2 = maxY;
        }
    } else if (vType === 'C') {
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
    }

    return b;
}
`;

content = content.replace('const Engine = {', helperCode + '\nconst Engine = {');

// 1. fitEntriesToGlyph 수정: cells에 d 저장 및 dynBounds 계산
const oldFitCellsReturn = '            return { dt, ink };\n        });';
const newFitCellsReturn = '            return { dt, ink, d };\n        });\n' +
'        const fitDynBounds = this.charsInfo.map((info, ci) => {\n' +
'            const vType = VOWEL_TYPE[info.jung] || \'V\';\n' +
'            return computeDynamicJamoBounds(cells[ci].d, 0, 1, R, info, vType, !!info.jong);\n' +
'        });';

if (content.includes(oldFitCellsReturn)) {
    content = content.replace(oldFitCellsReturn, newFitCellsReturn);
    console.log('Patched fitEntriesToGlyph cells return (LF)');
} else {
    content = content.replace(oldFitCellsReturn.replace(/\n/g, '\r\n'), newFitCellsReturn.replace(/\n/g, '\r\n'));
    console.log('Patched fitEntriesToGlyph cells return (CRLF)');
}

// 2. fitEntriesToGlyph e.region 필터 수정
const oldFitRegion = `            const jungYMax = (e.jongChar === 'ㄴ') ? 69 : 59;
            const choYMax = (e.vType === 'H') ? 38 : 54;
            e.region = cell.ink.filter(([x, y]) => {
                if (x < e.def[0] - 5 || x > e.def[0] + e.def[2] + 5 || y < e.def[1] - 5 || y > e.def[1] + e.def[3] + 5) return false;
                if (e.hasJong) {
                    if (e.part === 'cho') {
                        if (y > choYMax) return false;
                        if (e.vType !== 'H' && x > 58) return false;
                    } else if (e.part === 'jung') {
                        if (y > jungYMax) return false;
                        if (e.vType === 'H' && y < 35) return false;
                    } else if (e.part === 'jong') {
                        if (y < 54) return false;
                    }
                }
                return true;
            });`;

const newFitRegion = `            const jb = fitDynBounds[e.ci];
            const choY2 = jb ? jb.choY2 / s : ((e.vType === 'H') ? 38 : 54);
            const jungY1 = jb ? jb.jungY1 / s : 35;
            const jungY2 = jb ? jb.jungY2 / s : ((e.jongChar === 'ㄴ') ? 69 : 59);
            const jongY1 = jb ? jb.jongY1 / s : 54;
            const splitX = jb ? jb.splitX / s : 55;
            e.region = cell.ink.filter(([x, y]) => {
                if (x < e.def[0] - 8 || x > e.def[0] + e.def[2] + 8 || y < e.def[1] - 8 || y > e.def[1] + e.def[3] + 8) return false;
                if (jb) {
                    if (jb.vType === 'H' && jb.hasJong) {
                        if (e.part === 'cho' && y > choY2 + 2) return false;
                        if (e.part === 'jung' && (y < jungY1 - 2 || y > jungY2 + 2)) return false;
                        if (e.part === 'jong' && y < jongY1 - 2) return false;
                    } else if (jb.vType === 'V') {
                        if (e.part === 'cho') {
                            if (x > splitX + 3) return false;
                            if (jb.hasJong && y > choY2 + 3) return false;
                        } else if (e.part === 'jung') {
                            if (x < splitX - 3 && y > 22) return false;
                            if (jb.hasJong && y > jungY2 + 3) return false;
                        } else if (e.part === 'jong') {
                            if (jb.hasJong && y < jongY1 - 3) return false;
                        }
                    } else if (jb.vType === 'C') {
                        if (jb.hasJong && e.part === 'jong' && y < jongY1 - 3) return false;
                        if (e.part === 'cho') {
                            if (x > splitX + 3) return false;
                            if (jb.hasJong && y > jongY1 - 4) return false;
                        }
                    }
                }
                return true;
            });`;

if (content.includes(oldFitRegion)) {
    content = content.replace(oldFitRegion, newFitRegion);
    console.log('Patched fitRegion (LF)');
} else {
    content = content.replace(oldFitRegion.replace(/\n/g, '\r\n'), newFitRegion.replace(/\n/g, '\r\n'));
    console.log('Patched fitRegion (CRLF)');
}

// 3. buildGlyphData 내에서 dynBounds 계산 추가
const dynBoundsInit = `        const dynBounds = this.charsInfo.map((info, ci) => {
            const vType = VOWEL_TYPE[info.jung] || 'V';
            const hasJong = !!info.jong;
            return computeDynamicJamoBounds(img, ci, count, R, info, vType, hasJong);
        });
`;

content = content.replace('        const strokeEndLy = new Float32Array(this.strokes.length).fill(1e6);', '        const strokeEndLy = new Float32Array(this.strokes.length).fill(1e6);\n' + dynBoundsInit);

// 4. buildGlyphData 내의 거리 페널티 영역을 dynBounds 기반으로 보강
const oldPenalty = `                    // (가) 초성·중성 획은 종성 영역(하단 침필 한계선 아래) 픽셀을 절대 소유할 수 없음
                    if (hasJongCell && mk.part !== 'jong') {
                        const endCap = strokeEndLy[sId] < 1e5 ? (strokeEndLy[sId] + 1.5) : Math.min(maxPy[k] + w[k] * 1.65, minJongTopLy + 3);
                        if (ly > endCap) {
                            dist += 1e6;
                        } else if (strokeEndLy[sId] < 1e5 && ly > strokeEndLy[sId] - 10 && lx < px[starts[k + 1] - 1] - w[k] * 1.12) {
                            // 세로모음 침필 끝 좌측의 종성 상단부 픽셀이 세로모음에 빨려들어가는 현상 차단
                            dist += 1e6;
                        }
                    }
                    // (나) 종성 획은 초성·중성 상단 영역 픽셀을 소유할 수 없음
                    if (hasJongCell && mk.part === 'jong') {
                        const topFloor = Math.max(minPy[k] - w[k] * 1.28, minJongTopLy - 4);
                        if (ly < topFloor) dist += 1e6;
                    }
                    // (다) 초성과 우측 세로모음(중성) 간 좌우 침범 차단 (상단 역입 기필봉 ly<=82px은 보존)
                    if (mk.vType !== 'H' && minJungVLx < R) {
                        if (mk.part === 'cho' && lx > minJungVLx + 4) {
                            dist += 1e5;
                        } else if (mk.part === 'jung' && Math.abs(pty[starts[k]]) > 0.72 && ly > 82 && lx < meanPx[k] - w[k] * 1.55) {
                            dist += 1e5;
                        }
                    }`;

const newPenalty = `                    // ★ 동적 히스토그램 분할벽 (Dynamic Partition Walls) 적용: 자소 간 먹물 누수 100% 원천 차단
                    const jb = dynBounds[ci];
                    if (jb) {
                        if (jb.vType === 'H' && jb.hasJong) {
                            if (mk.part === 'cho' && ly > jb.choY2 + 3) dist += 1e7;
                            else if (mk.part === 'jung' && (ly < jb.jungY1 - 3 || ly > jb.jungY2 + 3)) dist += 1e7;
                            else if (mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                        } else if (jb.vType === 'V') {
                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.choY2 + 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                if (lx < jb.splitX - 3 && ly > 80) dist += 1e7;
                                if (jb.hasJong && strokeEndLy[sId] < 1e5 && ly > strokeEndLy[sId] + 3) dist += 1e7;
                            } else if (mk.part === 'jong') {
                                if (jb.hasJong && ly < jb.jongY1 - 3) dist += 1e7;
                            }
                        } else if (jb.vType === 'C') {
                            if (jb.hasJong && mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (jb.hasJong && ly > (jb.jongY1 || R) - 15) dist += 1e7;
                            }
                        }
                    }`;

if (content.includes(oldPenalty)) {
    content = content.replace(oldPenalty, newPenalty);
    console.log('Replaced penalty (LF)');
} else {
    content = content.replace(oldPenalty.replace(/\n/g, '\r\n'), newPenalty.replace(/\n/g, '\r\n'));
    console.log('Replaced penalty (CRLF)');
}

// 5. chk-glyph를 기본 checked로 설정
content = content.replace(
    '<input type="checkbox" id="chk-glyph" onchange="Engine.onGlyphToggle()">',
    '<input type="checkbox" id="chk-glyph" checked onchange="Engine.onGlyphToggle()">'
);

fs.writeFileSync('c:/project/한글획순/index.html', content, 'utf8');
console.log('Successfully updated index.html with Dynamic Histogram Partitioning and default glyph mode!');
