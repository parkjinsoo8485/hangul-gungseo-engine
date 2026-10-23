const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

// 1. In computeDynamicJamoBounds, properly place choYTop outside if (hasJong) for vType === 'V'
const oldBoundsV = `        if (hasJong) {
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
            let choYTop = R;
            const choRightV = Math.min(xSplit, Math.round(minX + (maxX - minX) * 0.48));
            for (let y = minY; y <= ySplit; y++) {
                for (let x = minX; x <= choRightV; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                        if (y < choYTop) { choYTop = y; break; }
                    }
                }
                if (choYTop < R) break;
            }
            b.choY1 = choYTop < R ? choYTop : minY;
            b.choY2 = ySplit;
            b.jongY1 = ySplit; b.jongY2 = maxY;
        }`;

const newBoundsV = `        let ySplit = maxY;
        if (hasJong) {
            ySplit = Math.round(minY + (maxY - minY) * 0.58);
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
            b.choY2 = ySplit;
            b.jongY1 = ySplit; b.jongY2 = maxY;
        }

        let choYTop = R;
        const choRightV = Math.min(xSplit, Math.round(minX + (maxX - minX) * 0.48));
        for (let y = minY; y <= ySplit; y++) {
            for (let x = minX; x <= choRightV; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                    if (y < choYTop) { choYTop = y; break; }
                }
            }
            if (choYTop < R) break;
        }
        b.choY1 = choYTop < R ? choYTop : minY;`;

// 2. Prevent rightward-extending horizontal branch strokes (like 'ㅏ' tick) from claiming pixels behind their start point
const oldJungV = `                            } else if (mk.part === 'jung') {
                                if (lx < jb.splitX - 3) dist += 1e7;
                                if (jb.hasJong && strokeEndLy[sId] < 1e5 && ly > strokeEndLy[sId] + 3) dist += 1e7;
                            }`;

const newJungV = `                            } else if (mk.part === 'jung') {
                                if (lx < jb.splitX - 3) dist += 1e7;
                                if (ptx[starts[k] + 1] > ptx[starts[k]] + 2 && lx < ptx[starts[k]] - 2) dist += 1e7;
                                if (jb.hasJong && strokeEndLy[sId] < 1e5 && ly > strokeEndLy[sId] + 3) dist += 1e7;
                            }`;

let patched = html;

if (patched.includes(oldBoundsV)) {
    patched = patched.replace(oldBoundsV, newBoundsV);
    console.log('Patched BoundsV');
} else console.log('Could not find oldBoundsV');

if (patched.includes(oldJungV)) {
    patched = patched.replace(oldJungV, newJungV);
    console.log('Patched JungV');
} else console.log('Could not find oldJungV');

fs.writeFileSync('index.html', patched.replace(/\n/g, '\r\n'), 'utf8');
console.log('Finished updating index.html');
