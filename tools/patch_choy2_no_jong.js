const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target = `        let choYTop = R;
        const choRightV = Math.min(xSplit - 2, Math.round(minX + (maxX - minX) * 0.46));
        for (let y = minY; y <= ySplit; y++) {
            for (let x = minX; x <= choRightV; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                    if (y < choYTop) { choYTop = y; break; }
                }
            }
            if (choYTop < R) break;
        }
        b.choY1 = choYTop < R ? choYTop : minY;`;

const repl = `        let choYTop = R, choYBot = 0;
        const choRightV = Math.min(xSplit - 2, Math.round(minX + (maxX - minX) * 0.46));
        for (let y = minY; y <= ySplit; y++) {
            for (let x = minX; x <= choRightV; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) {
                    if (y < choYTop) choYTop = y;
                    if (y > choYBot) choYBot = y;
                }
            }
        }
        b.choY1 = choYTop < R ? choYTop : minY;
        if (!hasJong) b.choY2 = choYBot > b.choY1 ? choYBot : maxY;`;

const normCode = code.replace(/\r?\n/g, '\n');
const normT = target.replace(/\r?\n/g, '\n');
const normR = repl.replace(/\r?\n/g, '\n');

if (!normCode.includes(normT)) { console.error('Target not found'); process.exit(1); }
const patched = normCode.replace(normT, normR);
fs.writeFileSync('index.html', patched, 'utf8');
console.log('Successfully set b.choY2 when !hasJong');
