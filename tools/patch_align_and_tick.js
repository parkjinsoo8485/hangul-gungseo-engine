const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

// 1. In fitEntriesToGlyph, snap e.fbox[1] to actTop directly
const oldFitV = `                if (jb.vType === 'V') {
                    if (e.part === 'cho') {
                        if (jb.choY1) {
                            const actTop = jb.choY1 / s;
                            if (e.fbox[1] < actTop - 0.5) {
                                const diff = (actTop - 0.5) - e.fbox[1];
                                e.fbox[1] = actTop - 0.5;
                                e.fbox[3] = Math.max(12, e.fbox[3] - diff);
                            }
                        }
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        if (jb.hasJong && e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(14, choY2 - e.fbox[1]);
                    }`;

const newFitV = `                if (jb.vType === 'V') {
                    if (e.part === 'cho') {
                        if (jb.choY1) {
                            const actTop = jb.choY1 / s;
                            const diff = actTop - e.fbox[1];
                            e.fbox[1] = actTop;
                            e.fbox[3] = Math.max(14, e.fbox[3] - diff);
                        }
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        if (jb.hasJong && e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(14, choY2 - e.fbox[1]);
                    }`;

const oldFitC = `                } else if (jb.vType === 'C') {
                    if (e.part === 'cho') {
                        if (jb.choY1) {
                            const actTop = jb.choY1 / s;
                            if (e.fbox[1] < actTop - 0.5) {
                                const diff = (actTop - 0.5) - e.fbox[1];
                                e.fbox[1] = actTop - 0.5;
                                e.fbox[3] = Math.max(12, e.fbox[3] - diff);
                            }
                        }
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        if (e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(12, choY2 - e.fbox[1]);
                    }`;

const newFitC = `                } else if (jb.vType === 'C') {
                    if (e.part === 'cho') {
                        if (jb.choY1) {
                            const actTop = jb.choY1 / s;
                            const diff = actTop - e.fbox[1];
                            e.fbox[1] = actTop;
                            e.fbox[3] = Math.max(12, e.fbox[3] - diff);
                        }
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        if (e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(12, choY2 - e.fbox[1]);
                    }`;

// 2. Fix the horizontal branch check in buildGlyphData
const oldTick = `if (ptx[starts[k] + 1] > ptx[starts[k]] + 2 && lx < ptx[starts[k]] - 2) dist += 1e7;`;
const newTick = `if (ptx[starts[k]] > 0.5 && lx < px[starts[k]] - 2) dist += 1e7;`;

let patched = html;
if (patched.includes(oldFitV)) {
    patched = patched.replace(oldFitV, newFitV);
    console.log('Patched FitV');
} else console.log('Could not find oldFitV');

if (patched.includes(oldFitC)) {
    patched = patched.replace(oldFitC, newFitC);
    console.log('Patched FitC');
} else console.log('Could not find oldFitC');

if (patched.includes(oldTick)) {
    patched = patched.replace(oldTick, newTick);
    console.log('Patched Tick');
} else console.log('Could not find oldTick');

fs.writeFileSync('index.html', patched.replace(/\n/g, '\r\n'), 'utf8');
console.log('Finished writing index.html');
