const fs = require('fs');
const lines = fs.readFileSync('warehouse_centerlines.js', 'utf8').split('\n');
const targets = ['Jung_T1_ㅔ', 'Jung_T2_ㅔ', 'Jung_T1_ㅖ', 'Jung_T2_ㅖ', 'Jung_T1_ㅞ', 'Jung_T2_ㅞ', 'Jung_T1_ㅐ', 'Jung_T2_ㅐ', 'Jung_T1_ㅒ', 'Jung_T2_ㅒ', 'Jung_T1_ㅙ', 'Jung_T2_ㅙ'];
targets.forEach(t => {
    lines.forEach((l, i) => {
        if (l.includes('"' + t + '":')) {
            console.log(t, 'at line', i + 1);
        }
    });
});
