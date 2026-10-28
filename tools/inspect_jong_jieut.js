const fs = require('fs');
global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;

['Jong_T1_ㅈ', 'Jong_T2_ㅈ'].forEach(id => {
    const p = parts[id];
    console.log(`\n=== ${id} (${p.c}) ===`);
    p.m.forEach((st, idx) => {
        const maxY = Math.max(...st.map(pt => pt[1]));
        const startY = st[0][1];
        console.log(`Stroke ${idx}: startY=${startY}, maxY=${maxY}, coords=${JSON.stringify(st)}`);
    });
});
