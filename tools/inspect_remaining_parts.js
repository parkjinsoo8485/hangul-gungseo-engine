const fs = require('fs');
global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;
const seen = new Set(['ㄷ', 'ㄸ', 'ㅌ', 'ㅁ', 'ㅍ', 'ㅋ', 'ㅙ', 'ㅞ', 'ㅘ', 'ㅝ', 'ㅚ', 'ㅟ', 'ㅢ', 'ㅖ', 'ㅒ', 'ㅐ', 'ㅔ', 'ㅛ', 'ㅠ']);

for (const [id, p] of Object.entries(parts)) {
    if (!seen.has(p.c)) {
        console.log(`\n${id} (${p.c}) box=${JSON.stringify(p.b)}`);
        p.m.forEach((st, i) => {
            if (st.length > 12) {
                console.log(`  s${i}: [circle len=${st.length}, start=[${st[0]}], end=[${st[st.length-1]}]]`);
            } else {
                console.log(`  s${i}: ${JSON.stringify(st)}`);
            }
        });
    }
}
