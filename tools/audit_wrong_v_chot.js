const fs = require('fs');
const bridge = fs.readFileSync('c:/project/한글획순/warehouse_bridge.js', 'utf8');
const match = bridge.match(/choT:\s*(\{[\s\S]*?\}),/);
const choT = JSON.parse(match[1]);

const V_VOWELS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅣ'];
const H_VOWELS = ['ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ'];
const C_VOWELS = ['ㅘ', 'ㅙ', 'ㅚ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅢ'];

const wrongV = [];
for (const [ch, t] of Object.entries(choT)) {
    const code = ch.charCodeAt(0) - 0xAC00;
    const jungIdx = Math.floor((code % (21 * 28)) / 28);
    const jungList = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
    const jung = jungList[jungIdx];
    // For V_VOWELS, T2 (horizontal-vowel Cho) should NEVER be used!
    if (V_VOWELS.includes(jung) && t === 2) {
        wrongV.push({ ch, jung, t });
    }
}

console.log(`Total V-vowel syllables with wrong choT=2: ${wrongV.length}`);
console.log('Sample wrong V syllables:', wrongV.slice(0, 30));
