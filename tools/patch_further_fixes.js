const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. In fitEntriesToGlyph, adjust choY1 to actual top ink
const oldFitV = `                if (jb.vType === 'V') {
                    if (e.part === 'cho') {
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        if (jb.hasJong && e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(14, choY2 - e.fbox[1]);
                    }`;

const newFitV = `                if (jb.vType === 'V') {
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

const oldFitH = `                } else if (jb.vType === 'H') {
                    if (e.part === 'cho') {
                        if (jb.hasJong && e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(12, choY2 - e.fbox[1]);
                    }`;

const newFitH = `                } else if (jb.vType === 'H') {
                    if (e.part === 'cho') {
                        if (jb.choY1) {
                            const actTop = jb.choY1 / s;
                            if (e.fbox[1] < actTop - 0.5) {
                                const diff = (actTop - 0.5) - e.fbox[1];
                                e.fbox[1] = actTop - 0.5;
                                e.fbox[3] = Math.max(12, e.fbox[3] - diff);
                            }
                        }
                        if (jb.hasJong && e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(12, choY2 - e.fbox[1]);
                    }`;

const oldFitC = `                } else if (jb.vType === 'C') {
                    if (e.part === 'cho') {
                        if (e.fbox[0] + e.fbox[2] > splitX - 0.5) e.fbox[2] = Math.max(14, splitX - 0.5 - e.fbox[0]);
                        if (e.fbox[1] + e.fbox[3] > choY2) e.fbox[3] = Math.max(12, choY2 - e.fbox[1]);
                    }`;

const newFitC = `                } else if (jb.vType === 'C') {
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

// 2. Allow diagonal strokes to extend into ink tip in buildGlyphData
const oldExtend = `                    const isLastH = dx > Math.abs(dy) * 2.0;
                    const isLastV = isSingleSeg && (sliced[0][4] === 'V' || dy > Math.abs(dx) * 2.0);
                    if (isLastH || isLastV) {`;

const newExtend = `                    const isLastH = dx > Math.abs(dy) * 2.0;
                    const isLastV = isSingleSeg && (sliced[0][4] === 'V' || dy > Math.abs(dx) * 2.0);
                    const isLastD = dl > 2.0 && sliced.length >= 6;
                    if (isLastH || isLastV || isLastD) {`;

// 3. Add distance corridor penalty in buildGlyphData
const oldDistStep = `                        if (crossedGap) dist += 600;
                    }
                    D[p * K + k] = dist; Ix[p * K + k] = bi;`;

const newDistStep = `                        if (crossedGap) dist += 600;
                    }
                    if (dist > w[k] * 2.2) {
                        dist += Math.pow(dist / (w[k] * 2.0), 2) * 50;
                    }
                    D[p * K + k] = dist; Ix[p * K + k] = bi;`;

const normHtml = html.replace(/\r\n/g, '\n');
let patched = normHtml;

if (patched.includes(oldFitV.replace(/\r\n/g, '\n'))) {
    patched = patched.replace(oldFitV.replace(/\r\n/g, '\n'), newFitV.replace(/\r\n/g, '\n'));
    console.log('Patched FitV');
} else console.log('Could not find FitV');

if (patched.includes(oldFitH.replace(/\r\n/g, '\n'))) {
    patched = patched.replace(oldFitH.replace(/\r\n/g, '\n'), newFitH.replace(/\r\n/g, '\n'));
    console.log('Patched FitH');
} else console.log('Could not find FitH');

if (patched.includes(oldFitC.replace(/\r\n/g, '\n'))) {
    patched = patched.replace(oldFitC.replace(/\r\n/g, '\n'), newFitC.replace(/\r\n/g, '\n'));
    console.log('Patched FitC');
} else console.log('Could not find FitC');

if (patched.includes(oldExtend.replace(/\r\n/g, '\n'))) {
    patched = patched.replace(oldExtend.replace(/\r\n/g, '\n'), newExtend.replace(/\r\n/g, '\n'));
    console.log('Patched Extend');
} else console.log('Could not find Extend');

if (patched.includes(oldDistStep.replace(/\r\n/g, '\n'))) {
    patched = patched.replace(oldDistStep.replace(/\r\n/g, '\n'), newDistStep.replace(/\r\n/g, '\n'));
    console.log('Patched DistStep');
} else console.log('Could not find DistStep');

fs.writeFileSync('index.html', patched.replace(/\n/g, '\r\n'), 'utf8');
console.log('Wrote updated index.html');
