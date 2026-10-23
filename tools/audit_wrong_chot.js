const fs = require('fs');
const bridge = fs.readFileSync('c:/project/한글획순/warehouse_bridge.js', 'utf8');
const match = bridge.match(/choT:\s*(\{[\s\S]*?\}),/);
const choT = JSON.parse(match[1]);

// Check which syllables with horizontal vowels (ㅗ, ㅛ, ㅜ, ㅠ, ㅡ) have choT === 1 (which forces vertical vowel Cho_T1)
const H_VOWELS = ['ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ'];

const wrongT1 = [];
for (const [ch, t] of Object.entries(choT)) {
    const code = ch.charCodeAt(0) - 0xAC00;
    const jungIdx = Math.floor((code % (21 * 28)) / 28);
    const jungList = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
    const jung = jungList[jungIdx];
    if (H_VOWELS.includes(jung) && t === 1) {
        wrongT1.push({ ch, jung, t });
    }
}

console.log(`Total H-vowel syllables with wrong choT=1: ${wrongT1.length}`);
console.log('Sample wrong syllables:', wrongT1.slice(0, 40));
