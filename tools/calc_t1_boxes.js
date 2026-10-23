const fs = require('fs');
let code = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const start = code.indexOf('{');
const end = code.lastIndexOf('}');
const data = JSON.parse(code.slice(start, end + 1));
const parts = data.parts;

const t1ChoKeys = Object.keys(parts).filter(k => k.startsWith('Cho_T1_'));
const newBoxes = {};
t1ChoKeys.forEach(k => {
    const p = parts[k];
    let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
    p.m.forEach(st => st.forEach(([x, y]) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }));
    const bx = Math.max(50, Math.round(minX - 20));
    const bw = Math.round(maxX - minX + 40);
    const by = Math.max(250, Math.round(minY - 25));
    const bh = Math.round(maxY - minY + 50);
    newBoxes[k] = [bx, by, bw, bh];
});

console.log('Proposed boxes for Cho_T1:');
console.table(newBoxes);
