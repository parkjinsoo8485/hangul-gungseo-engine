const fs = require('fs');
let codeWH = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const window = {};
eval(codeWH);
const parts = window.HANGUL_WH_CENTERLINES.parts;

Object.keys(parts).filter(k => k.startsWith('Jung_')).sort().forEach(k => {
    const p = parts[k];
    const xs = p.m.flat().map(pt => pt[0]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const midX = (minX + maxX) * 0.5;
    console.log(`${k} (${p.c}): minX=${(minX/10.24).toFixed(1)} maxX=${(maxX/10.24).toFixed(1)} midX=${(midX/10.24).toFixed(1)} strokes=${p.m.length}`);
});
