const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

const targetC = `        let choYTop = R;
        for (let y = minY; y <= yCho; y++) {
            for (let x = minX; x <= xSplit; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                    if (y < choYTop) { choYTop = y; break; }
                }
            }
            if (choYTop < R) break;
        }
        b.choY1 = choYTop < R ? choYTop : minY;
        b.choY2 = yCho;`;

const replC = `        let choYTop = R;
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
        b.choY2 = yCho;`;

const targetV = `            let choYTop = R;
            for (let y = minY; y <= ySplit; y++) {
                for (let x = minX; x <= xSplit; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                        if (y < choYTop) { choYTop = y; break; }
                    }
                }
                if (choYTop < R) break;
            }
            b.choY1 = choYTop < R ? choYTop : minY;`;

const replV = `            let choYTop = R;
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

let patched = html;
if (patched.includes(targetC)) {
    patched = patched.replace(targetC, replC);
    console.log('Replaced targetC');
} else console.log('targetC not found');

if (patched.includes(targetV)) {
    patched = patched.replace(targetV, replV);
    console.log('Replaced targetV');
} else console.log('targetV not found');

fs.writeFileSync('index.html', patched.replace(/\n/g, '\r\n'), 'utf8');
