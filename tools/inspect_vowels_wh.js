const fs = require('fs');
global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;

['Jung_T1_ㅖ', 'Jung_T2_ㅖ', 'Jung_T1_ㅒ', 'Jung_T2_ㅒ', 'Jung_T1_ㅐ', 'Jung_T2_ㅐ', 'Jung_T1_ㅔ', 'Jung_T2_ㅔ', 'Jung_T1_ㅛ', 'Jung_T2_ㅛ', 'Jung_T1_ㅠ', 'Jung_T2_ㅠ'].forEach(id => {
    const p = parts[id];
    if (!p) return;
    console.log(`\n=== ${id} (${p.c}) box=${JSON.stringify(p.b)} ===`);
    p.m.forEach((st, idx) => {
        console.log(`  Stroke ${idx}: start=[${st[0]}] end=[${st[st.length-1]}] pts=${JSON.stringify(st)}`);
    });
});
