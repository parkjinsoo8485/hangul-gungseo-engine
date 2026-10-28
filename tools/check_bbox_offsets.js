const fs = require('fs');
const content = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
const data = JSON.parse(jsonStr);
const dict = data.parts;

for (const [key, val] of Object.entries(dict)) {
    if (!val.m || !val.b) continue;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const stroke of val.m) {
        for (const pt of stroke) {
            if (pt[0] < minX) minX = pt[0];
            if (pt[0] > maxX) maxX = pt[0];
            if (pt[1] < minY) minY = pt[1];
            if (pt[1] > maxY) maxY = pt[1];
        }
    }
    const [bx1, by1, bx2, by2] = val.b;
    const diffX1 = minX - bx1;
    const diffX2 = bx2 - maxX;
    if (diffX1 > 50 || diffX2 > 50) {
        console.log(`${key}: bbox=[${val.b.join(',')}] strokeX=[${minX}, ${maxX}] diffX1=${diffX1} diffX2=${diffX2}`);
    }
}
