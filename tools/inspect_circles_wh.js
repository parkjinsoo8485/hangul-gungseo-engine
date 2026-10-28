const fs = require('fs');
global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;

['Cho_T1_ㅎ', 'Cho_T2_ㅎ', 'Cho_T3_ㅎ', 'Jong_T1_ㅎ', 'Jong_T2_ㅎ', 'Cho_T1_ㅇ', 'Cho_T2_ㅇ', 'Cho_T3_ㅇ', 'Jong_T1_ㅇ', 'Jong_T2_ㅇ'].forEach(id => {
    const p = parts[id];
    console.log(`\n=== ${id} (${p.c}) ===`);
    p.m.forEach((st, idx) => {
        console.log(`  Stroke ${idx} (len=${st.length}): start=[${st[0]}] end=[${st[st.length-1]}]`);
        if (st.length <= 10) console.log(`    pts=${JSON.stringify(st)}`);
        else {
            // check circle winding and closure
            const dx = st[st.length-1][0] - st[0][0];
            const dy = st[st.length-1][1] - st[0][1];
            let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
            st.forEach(([x, y]) => {
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            });
            console.log(`    bbox=[${minX}..${maxX}, ${minY}..${maxY}], closeDist=${Math.hypot(dx,dy).toFixed(1)}, first3=${JSON.stringify(st.slice(0,3))}, last3=${JSON.stringify(st.slice(-3))}`);
        }
    });
});
