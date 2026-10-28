const fs = require('fs');
global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;

// Print all compound vowels and all ㄷ, ㄸ, ㅌ, ㅁ, ㅍ, ㅋ, ㅈ, ㅊ, ㅎ, ㅇ parts
const targetChars = ['ㄷ', 'ㄸ', 'ㅌ', 'ㅁ', 'ㅍ', 'ㅋ', 'ㅙ', 'ㅞ', 'ㅘ', 'ㅝ', 'ㅚ', 'ㅟ', 'ㅢ', 'ㅖ', 'ㅒ', 'ㅐ', 'ㅔ', 'ㅛ', 'ㅠ'];
for (const [id, p] of Object.entries(parts)) {
    if (targetChars.includes(p.c)) {
        console.log(`\n${id} (${p.c}) box=${JSON.stringify(p.b)}`);
        p.m.forEach((st, i) => {
            console.log(`  s${i}: ${JSON.stringify(st)}`);
        });
    }
}
