const fs = require('fs');

let bridge = fs.readFileSync('c:/project/한글획순/warehouse_bridge.js', 'utf8');
const match = bridge.match(/choT:\s*(\{[\s\S]*?\}),/);
const choT = JSON.parse(match[1]);

const H_VOWELS = ['ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ'];
const C_VOWELS = ['ㅘ', 'ㅙ', 'ㅚ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅢ'];
const jungList = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];

let removed = 0;
for (const [ch, t] of Object.entries(choT)) {
    const code = ch.charCodeAt(0) - 0xAC00;
    const jungIdx = Math.floor((code % (21 * 28)) / 28);
    const jung = jungList[jungIdx];
    // Remove if H_VOWEL had t === 1
    if (H_VOWELS.includes(jung) && t === 1) {
        delete choT[ch];
        removed++;
    }
    // Remove if C_VOWEL had t === 1
    if (C_VOWELS.includes(jung) && t === 1) {
        delete choT[ch];
        removed++;
    }
}

console.log(`Cleaned ${removed} bogus choT overrides! Remaining overrides: ${Object.keys(choT).length}`);

// Replace choT in bridge
const newBridge = bridge.replace(/choT:\s*\{[\s\S]*?\},/, `choT: ${JSON.stringify(choT)},`);
fs.writeFileSync('c:/project/한글획순/warehouse_bridge.js', newBridge);
console.log('Saved cleaned warehouse_bridge.js');
