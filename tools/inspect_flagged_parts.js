const fs = require('fs');
global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;

['Cho_T1_ㄹ', 'Jong_T1_ㄷ', 'Jong_T2_ㄷ', 'Jong_T1_ㅀ'].forEach(id => {
    const p = parts[id];
    console.log(`\n=== ${id} (${p.c}) ===`);
    p.m.forEach((st, idx) => {
        console.log(`Stroke ${idx}:`, JSON.stringify(st));
    });
});
