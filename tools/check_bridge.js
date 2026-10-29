const fs = require('fs');
const bridge = fs.readFileSync('warehouse_bridge.js', 'utf8');
const lines = bridge.split('\n');
lines.forEach((l, i) => {
    if (l.includes('ㅞ') || l.includes('ㅙ') || l.includes('ㅝ') || l.includes('ㅘ') || l.includes('ㅚ') || l.includes('ㅟ') || l.includes('ㅢ')) {
        console.log(i + 1, l.slice(0, 110));
    }
});
