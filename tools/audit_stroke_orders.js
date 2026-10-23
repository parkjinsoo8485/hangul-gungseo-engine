const fs = require('fs');

global.window = global;
eval(fs.readFileSync('c:/project/한글획순/warehouse_centerlines.js', 'utf8'));

const parts = HANGUL_WH_CENTERLINES.parts;
console.log('Total parts in warehouse:', Object.keys(parts).length);

const orderAudit = [];

for (const [id, p] of Object.entries(parts)) {
    const { c: char, r: role, t: formType, m: strokes } = p;
    
    // Check direction and starting points
    strokes.forEach((st, si) => {
        const start = st[0];
        const end = st[st.length - 1];
        const dx = end[0] - start[0];
        const dy = end[1] - start[1]; // HanziWriter: dy > 0 is upwards, dy < 0 is downwards
        
        // 1. Horizontal stroke should go left -> right (dx > 0)
        // If stroke is mainly horizontal (|dx| > 2 * |dy|), dx should be > 0
        if (Math.abs(dx) > 2 * Math.abs(dy) && dx < -50) {
            orderAudit.push(`${id} stroke ${si} HORIZONTAL REVERSE: start=[${start}] end=[${end}] (goes right-to-left!)`);
        }

        // 2. Vertical stroke should go top -> bottom (in HanziWriter, start[1] > end[1] => dy < 0)
        // Except for closed circle (ㅇ) where it loops
        const isClosed = Math.hypot(dx, dy) < 40;
        if (!isClosed && Math.abs(dy) > 2 * Math.abs(dx) && dy > 50) {
            orderAudit.push(`${id} stroke ${si} VERTICAL REVERSE: start=[${start}] end=[${end}] (goes bottom-to-top!)`);
        }
    });

    // Check specific jamo stroke counts
    const expectedCounts = {
        'ㄱ': 1, 'ㄴ': 1, 'ㄷ': 2, 'ㄹ': 3, 'ㅁ': 3, 'ㅂ': 4, 'ㅅ': 2, 'ㅇ': 1,
        'ㅈ': 3, 'ㅊ': 4, 'ㅋ': 2, 'ㅌ': 3, 'ㅍ': 4, 'ㅎ': 3,
        'ㄲ': 2, 'ㄸ': 4, 'ㅃ': 8, 'ㅆ': 4, 'ㅉ': 6,
        'ㅏ': 2, 'ㅐ': 3, 'ㅑ': 3, 'ㅒ': 4, 'ㅓ': 2, 'ㅔ': 3, 'ㅕ': 3, 'ㅖ': 4,
        'ㅗ': 2, 'ㅘ': 4, 'ㅙ': 5, 'ㅚ': 3, 'ㅛ': 3, 'ㅜ': 2, 'ㅝ': 4, 'ㅞ': 5,
        'ㅟ': 3, 'ㅠ': 3, 'ㅡ': 1, 'ㅢ': 2, 'ㅣ': 1
    };

    if (expectedCounts[char] && strokes.length !== expectedCounts[char]) {
        // Some consonants might be drawn as 2 strokes (e.g. ㅈ as 2 or 3, ㅊ as 3 or 4)
        if (!(char === 'ㅈ' && (strokes.length === 2 || strokes.length === 3)) &&
            !(char === 'ㅊ' && (strokes.length === 3 || strokes.length === 4)) &&
            !(char === 'ㅃ' && strokes.length === 4) &&
            !(char === 'ㅉ' && strokes.length === 4)) {
            orderAudit.push(`${id} (${char}): stroke count is ${strokes.length}, expected ${expectedCounts[char]}`);
        }
    }
}

console.log(`\nAudit completed with ${orderAudit.length} findings:`);
orderAudit.forEach(a => console.log(' - ' + a));
