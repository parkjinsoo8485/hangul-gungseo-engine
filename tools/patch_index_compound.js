const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
const crlf = code.includes('\r\n');
const norm = s => s.replace(/\r\n/g, '\n');

// 1. In computeDynamicJamoBounds: double stem detection for vType === 'C' and peakRuns for isU
const target1 = `        const Hc = maxY - minY;
        const yTopHalf = Math.round(minY + Hc * 0.45);
        const stemCols = [];
        let maxStemCol = 0;
        const stemScanStart = Math.round(minX + (maxX - minX) * 0.58);
        const stemScanEnd = maxX;
        for (let x = stemScanStart; x <= stemScanEnd; x++) {
            let sum = 0;
            for (let y = minY; y <= yTopHalf; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) sum++;
            }
            stemCols.push({ x, sum });
            if (sum > maxStemCol) maxStemCol = sum;
        }
        let stemX = Math.round(minX + (maxX - minX) * 0.75);
        if (maxStemCol >= 3) {
            const peakCols = stemCols.filter(c => c.sum >= maxStemCol * 0.85);
            if (peakCols.length) {
                stemX = Math.round((peakCols[0].x + peakCols[peakCols.length - 1].x) * 0.5);
            }
        }
        b.stemX_C = stemX;
        let minXVal = 1e9, xSplit = stemX - Math.max(4, Math.round(R * 0.03));
        const xStart = Math.round(minX + (maxX - minX) * 0.45);
        const xEnd = stemX - Math.max(3, Math.round(R * 0.02));
        for (let x = xEnd; x >= xStart; x--) {
            let colSum = 0;
            for (let y = minY; y <= yTopHalf; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) colSum++;
            }
            if (colSum < minXVal) { minXVal = colSum; xSplit = x; }
            if (colSum === 0) break;
        }
        b.splitX = xSplit;`;

const repl1 = `        const Hc = maxY - minY;
        const yTopHalf = Math.round(minY + Hc * 0.45);
        const isDoubleStem = (info.jung === 'ㅙ' || info.jung === 'ㅞ');
        const stemCols = [];
        let maxStemCol = 0;
        const stemScanStart = Math.round(minX + (maxX - minX) * (isDoubleStem ? 0.44 : 0.58));
        const stemScanEnd = isDoubleStem ? Math.round(minX + (maxX - minX) * 0.68) : maxX;
        for (let x = stemScanStart; x <= stemScanEnd; x++) {
            let sum = 0;
            for (let y = minY; y <= yTopHalf; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) sum++;
            }
            stemCols.push({ x, sum });
            if (sum > maxStemCol) maxStemCol = sum;
        }
        let stemX = Math.round(minX + (maxX - minX) * (isDoubleStem ? 0.55 : 0.75));
        if (maxStemCol >= 3) {
            const peakCols = stemCols.filter(c => c.sum >= maxStemCol * 0.85);
            if (peakCols.length) {
                stemX = Math.round((peakCols[0].x + peakCols[peakCols.length - 1].x) * 0.5);
            }
        }
        b.stemX_C = stemX;
        let minXVal = 1e9, xSplit = stemX - Math.max(4, Math.round(R * 0.03));
        const xStart = Math.round(minX + (maxX - minX) * (isDoubleStem ? 0.32 : 0.45));
        const xEnd = stemX - Math.max(3, Math.round(R * 0.02));
        for (let x = xEnd; x >= xStart; x--) {
            let colSum = 0;
            for (let y = minY; y <= yTopHalf; y++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) colSum++;
            }
            if (colSum < minXVal) { minXVal = colSum; xSplit = x; }
            if (colSum === 0) break;
        }
        b.splitX = xSplit;`;

// 2. peakRuns for isU
const target2 = `        if (isU) {
            const yStart = Math.min(maxY - 4, yBarC + Math.max(3, Math.round(Hc * 0.05)));
            const yEnd = hasJong ? Math.min(maxY, (b.jongY1 || maxY)) : maxY;
            const xRightLimit = Math.max(minX + 8, xSplit - 2);
            let stemX_U = Math.round(minX + (xRightLimit - minX) * 0.5), maxStemRun = -1;
            let stemBot = yStart;
            for (let x = minX + 2; x <= xRightLimit; x++) {
                let run = 0, lastY = yStart;
                for (let y = yStart; y <= yEnd; y++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) { run++; lastY = y; }
                }
                if (run > maxStemRun) { maxStemRun = run; stemX_U = x; stemBot = lastY; }
            }
            if (maxStemRun >= 4) {
                b.stemX_U = stemX_U;
                b.stemBotY_U = stemBot;
            }
        }`;

const repl2 = `        if (isU) {
            const yStart = Math.min(maxY - 4, yBarC + Math.max(3, Math.round(Hc * 0.05)));
            const yEnd = hasJong ? Math.min(maxY, (b.jongY1 || maxY)) : maxY;
            const xRightLimit = Math.max(minX + 8, xSplit - 2);
            let stemX_U = Math.round(minX + (xRightLimit - minX) * 0.5), maxStemRun = -1;
            let stemBot = yStart;
            const uRuns = [];
            for (let x = minX + 2; x <= xRightLimit; x++) {
                let run = 0, lastY = yStart;
                for (let y = yStart; y <= yEnd; y++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) { run++; lastY = y; }
                }
                uRuns.push({ x, run, lastY });
                if (run > maxStemRun) { maxStemRun = run; stemBot = lastY; }
            }
            if (maxStemRun >= 4) {
                const peakRuns = uRuns.filter(r => r.run >= maxStemRun * 0.85);
                if (peakRuns.length) {
                    stemX_U = Math.round((peakRuns[0].x + peakRuns[peakRuns.length - 1].x) * 0.5);
                }
                b.stemX_U = stemX_U;
                b.stemBotY_U = stemBot;
            }
        }`;

// 3. In fitEntriesToGlyph: jung_v jungLeftWall
const target3 = `                        } else if (e.subPart === 'jung_v') {
                            // 세로모음(ㅏ/ㅐ/ㅣ/ㅓ/ㅔ): splitX 우측 전체 영역
                            const isLeftTick = ['ㅓ', 'ㅕ'].some(v => (e.whId || e.char || '').includes(v));
                            const jungLeftWall = isLeftTick ? splitX - 3.0 : splitX + 0.5;
                            const actMaxX = jb.maxX / s;
                            if (e.fbox[0] < jungLeftWall) {
                                e.fbox[0] = jungLeftWall;
                            }`;

const repl3 = `                        } else if (e.subPart === 'jung_v') {
                            // 세로모음(ㅏ/ㅐ/ㅣ/ㅓ/ㅔ): splitX 우측 전체 영역
                            const isDoubleStem = ['ㅙ', 'ㅞ'].some(v => (e.whId || e.char || '').includes(v));
                            const isLeftTick = ['ㅓ', 'ㅕ', 'ㅔ', 'ㅖ', 'ㅞ'].some(v => (e.whId || e.char || '').includes(v));
                            const jungLeftWall = isDoubleStem ? (splitX - 1.0) : (isLeftTick ? splitX - 3.0 : splitX + 0.5);
                            const actMaxX = jb.maxX / s;
                            if (e.fbox[0] < jungLeftWall) {
                                e.fbox[0] = jungLeftWall;
                            }`;

// 4. In stroke extension: firstStemX - 0.5
const target4 = `                            // ★ ㅓ/ㅕ 곁점 및 이중모음 가로획: 세로 기둥 너머로 관통하지 못하도록 상한 차단
                            if (meta.part === 'jung' && isLastH) {
                                if ((sliced[0][0] - ci * 100) < firstStemX - 1.0) {
                                    if (lx100 > firstStemX + 0.2) break;
                                } else if (stemXList.length >= 2) {
                                    if (lx100 > stemXList[1] + 0.2) break;
                                }
                            }`;

const repl4 = `                            // ★ ㅓ/ㅕ 곁점 및 이중모음 가로획: 세로 기둥 너머로 관통하지 못하도록 상한 차단
                            if (meta.part === 'jung' && isLastH) {
                                if ((sliced[0][0] - ci * 100) < firstStemX - 0.5) {
                                    if (lx100 > firstStemX + 0.2) break;
                                } else if (stemXList.length >= 2) {
                                    if (lx100 > stemXList[1] + 0.2) break;
                                }
                            }`;

let cNorm = norm(code);

if (!cNorm.includes(norm(target1))) console.error('target1 not found');
else cNorm = cNorm.replace(norm(target1), norm(repl1));

if (!cNorm.includes(norm(target2))) console.error('target2 not found');
else cNorm = cNorm.replace(norm(target2), norm(repl2));

if (!cNorm.includes(norm(target3))) console.error('target3 not found');
else cNorm = cNorm.replace(norm(target3), norm(repl3));

if (!cNorm.includes(norm(target4))) console.error('target4 not found');
else cNorm = cNorm.replace(norm(target4), norm(repl4));

// Update script tags to new cache-buster version
cNorm = cNorm.replace(/warehouse_centerlines\.js\?v=[^"']+/g, 'warehouse_centerlines.js?v=20261029_1050');
cNorm = cNorm.replace(/warehouse_bridge\.js\?v=[^"']+/g, 'warehouse_bridge.js?v=20261029_1050');

fs.writeFileSync('index.html', crlf ? cNorm.replace(/\n/g, '\r\n') : cNorm);
console.log('Successfully patched index.html');
