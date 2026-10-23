const fs = require('fs');
const bridge = fs.readFileSync('c:/project/한글획순/warehouse_bridge.js', 'utf8');
const match = bridge.match(/choT:\s*(\{[\s\S]*?\}),/);
const choT = JSON.parse(match[1]);

const C_VOWELS = ['ㅘ', 'ㅙ', 'ㅚ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅢ'];

const cCounts = {};
for (const [ch, t] of Object.entries(choT)) {
    const code = ch.charCodeAt(0) - 0xAC00;
    const jungIdx = Math.floor((code % (21 * 28)) / 28);
    const jungList = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
    const jung = jungList[jungIdx];
    if (C_VOWELS.includes(jung)) {
        cCounts[t] = (cCounts[t] || 0) + 1;
    }
}

console.log('Compound vowel choT distribution:', cCounts);
