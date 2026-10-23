const fs = require('fs');

console.log('--- 1. Patching warehouse_bridge.js ---');
let wb = fs.readFileSync('c:/project/한글획순/warehouse_bridge.js', 'utf8');

// When info.jung === 'ㅡ', jong has plenty of height, so prefer T1
wb = wb.replace(
    `else first = vType === 'V' ? 1 : 2;`,
    `else if (vType === 'V' || info.jung === 'ㅡ') first = 1;\n        else first = 2;`
);

fs.writeFileSync('c:/project/한글획순/warehouse_bridge.js', wb, 'utf8');
console.log('warehouse_bridge.js patched.');

console.log('--- 2. Patching index.html ---');
let html = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

// (A) Fix splitX search range for double-stem compound vowels (ㅞ, ㅙ) in computeDynamicJamoBounds
const oldCSplit = `        // (1) splitX: 초성·가로모음(좌측)과 세로모음(우측) 사이의 수직 분할벽 (52%~78% 범위 탐색)
        let xSplit = Math.round(minX + (maxX - minX) * 0.62);
        let minXVal = 1e9;
        const xStart = Math.round(minX + (maxX - minX) * 0.50);
        const xEnd = Math.round(minX + (maxX - minX) * 0.82);`;

const newCSplit = `        // (1) splitX: 초성·가로모음(좌측)과 세로모음(우측) 사이의 수직 분할벽
        const isDoubleV = (info.jung === 'ㅞ' || info.jung === 'ㅙ');
        let xSplit = Math.round(minX + (maxX - minX) * (isDoubleV ? 0.48 : 0.62));
        let minXVal = 1e9;
        const xStart = Math.round(minX + (maxX - minX) * (isDoubleV ? 0.38 : 0.50));
        const xEnd = Math.round(minX + (maxX - minX) * (isDoubleV ? 0.58 : 0.82));`;

if (html.includes(oldCSplit)) {
    html = html.replace(oldCSplit, newCSplit);
    console.log('Replaced CSplit search range.');
} else {
    html = html.replace(oldCSplit.replace(/\n/g, '\r\n'), newCSplit.replace(/\n/g, '\r\n'));
    console.log('Replaced CSplit search range (CRLF).');
}

// (B) Fix vType === 'C' partition walls in buildGlyphData so vertical stem of ㅗ is never starved
const oldCPart = `                        } else if (jb.vType === 'C') {
                            if (jb.hasJong && mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (ly > jb.choY2 + 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                const isVerticalJung = (mk.subPart === 'jung_v' || lx > jb.splitX - 12);
                                if (isVerticalJung && lx < jb.splitX - 3) dist += 1e7;
                                if (!isVerticalJung && ly < jb.choY2 - 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.jongY1 + 3 && lx < jb.splitX) dist += 1e7;
                            }
                        }`;

const newCPart = `                        } else if (jb.vType === 'C') {
                            if (jb.hasJong && mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (ly > jb.choY2 + (jb.hasJong ? Math.max(15, (jb.jongY1 - jb.choY2) * 0.45) : 35)) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                const isVerticalJung = (mk.subPart === 'jung_v' || lx > jb.splitX - 12);
                                if (isVerticalJung && lx < jb.splitX - 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.jongY1 + 3 && lx < jb.splitX) dist += 1e7;
                            }
                        }`;

if (html.includes(oldCPart)) {
    html = html.replace(oldCPart, newCPart);
    console.log('Fixed vType C partition walls.');
} else {
    html = html.replace(oldCPart.replace(/\n/g, '\r\n'), newCPart.replace(/\n/g, '\r\n'));
    console.log('Fixed vType C partition walls (CRLF).');
}

fs.writeFileSync('c:/project/한글획순/index.html', html, 'utf8');
console.log('index.html updated successfully.');
