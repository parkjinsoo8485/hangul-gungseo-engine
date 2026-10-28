const fs = require('fs');

global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;

console.log('=== Checking all parts in warehouse_centerlines.js ===');
for (const [id, p] of Object.entries(parts)) {
    if (p.c === 'ㅂ' || p.c === 'ㅍ' || p.c === 'ㅎ' || p.c === 'ㄹ' || p.c === 'ㅌ' || p.c === 'ㅈ' || p.c === 'ㅊ') {
        console.log(`\nPart: ${id} (char: ${p.c}, role: ${p.r}, type: ${p.t})`);
        p.m.forEach((st, idx) => {
            const start = st[0];
            const end = st[st.length - 1];
            console.log(`  stroke ${idx}: len=${st.length}, start=[${start}], end=[${end}]`);
        });
    }
}
