// Test tight normalization vs current normalization on '획' and '순'
const fs = require('fs');
const window = {};
eval(fs.readFileSync('warehouse_centerlines.js', 'utf8'));
const wh = window.HANGUL_WH_CENTERLINES;

function testJamo(id) {
    const p = wh.parts[id];
    const strokes = p.m.filter(s => s.length >= 2);
    const xs = strokes.flat().map(pt => pt[0]);
    const ys = strokes.flat().map(pt => pt[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    console.log(`=== ${id} ===`);
    console.log(`p.b: [${p.b.join(', ')}] (width=${p.b[2]}, height=${p.b[3]})`);
    console.log(`tight: [${minX}, ${minY}, ${maxX - minX}, ${maxY - minY}]`);
}

testJamo('Cho_T3_ㅎ');
testJamo('Jung_T2_ㅚ');
testJamo('Jong_T2_ㄱ');
testJamo('Cho_T2_ㅅ');
testJamo('Jung_T2_ㅜ');
testJamo('Jong_T2_ㄴ');
