const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

// 1. Dynamic choY1 calculation in computeDynamicJamoBounds for V and C
const oldComputeC = `        b.choY1 = minY; b.choY2 = yCho;`;
const newComputeC = `        let choYTop = R;
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

const oldComputeV = `            b.choY1 = minY; b.choY2 = ySplit;`;
const newComputeV = `            let choYTop = R;
            for (let y = minY; y <= ySplit; y++) {
                for (let x = minX; x <= xSplit; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                        if (y < choYTop) { choYTop = y; break; }
                    }
                }
                if (choYTop < R) break;
            }
            b.choY1 = choYTop < R ? choYTop : minY;
            b.choY2 = ySplit;`;

// 2. Extend diagonal strokes (isLastD)
const oldExtend = `const isLastD = dl > 2.0 && sliced.length >= 6;`;
const newExtend = `const isLastD = dl > 0.05 && sliced.length >= 4;`;

// 3. Gap count penalty (penalize distant strokes crossing whitespace)
const oldGap = `                        if (crossedGap) dist += 600;`;
const newGap = `                        if (crossedGap || (exitedInk && steps >= 4)) dist += 600;`;

let patched = html;

if (patched.includes(oldComputeC)) {
    patched = patched.replace(oldComputeC, newComputeC);
    console.log('Patched ComputeC');
} else console.log('Could not find ComputeC');

if (patched.includes(oldComputeV)) {
    patched = patched.replace(oldComputeV, newComputeV);
    console.log('Patched ComputeV');
} else console.log('Could not find ComputeV');

if (patched.includes(oldExtend)) {
    patched = patched.replace(oldExtend, newExtend);
    console.log('Patched Extend');
} else console.log('Could not find Extend');

if (patched.includes(oldGap)) {
    patched = patched.replace(oldGap, newGap);
    console.log('Patched Gap');
} else console.log('Could not find Gap');

fs.writeFileSync('index.html', patched.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully wrote index.html');
