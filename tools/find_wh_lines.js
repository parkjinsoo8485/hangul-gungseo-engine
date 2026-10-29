const fs = require('fs');
let code = fs.readFileSync('warehouse_centerlines.js', 'utf8');

// Find Jung_T1_ㅙ, Jung_T2_ㅙ, Jung_T1_ㅞ, Jung_T2_ㅞ lines
const lines = code.split('\n');
lines.forEach((l, i) => {
    if (l.includes('"Jung_T1_ㅙ"') || l.includes('"Jung_T2_ㅙ"') || l.includes('"Jung_T1_ㅞ"') || l.includes('"Jung_T2_ㅞ"')) {
        console.log(i + 1, l);
    }
});
