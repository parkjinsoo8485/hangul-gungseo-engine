const fs = require('fs');

global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;

// Let's count strokes for characters in warehouse or procedural
function getCharStrokes(char) {
    const code = char.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return 0;
    const choIdx = Math.floor(code / 588);
    const jungIdx = Math.floor((code % 588) / 28);
    const jongIdx = code % 28;

    const CHOS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    const JUNGS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
    const JONGS = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

    const cho = CHOS[choIdx];
    const jung = JUNGS[jungIdx];
    const jong = JONGS[jongIdx];

    return { cho, jung, jong };
}

// Check some words
['대한', '대한민국', '꽃길', '아름다운', '훈민정음', '한글', '궁서체', '서예', '한', '글', '궁', '서', '영', '꽃', '삶'].forEach(w => {
    let total = 0;
    const counts = [];
    for (const c of w) {
        const decomp = getCharStrokes(c);
        counts.push(`${c}: ${JSON.stringify(decomp)}`);
    }
    console.log(`${w}:`, counts);
});
