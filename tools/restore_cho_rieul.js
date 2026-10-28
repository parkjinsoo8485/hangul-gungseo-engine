const fs = require('fs');

const code = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const window = {};
eval(code);
const parts = window.HANGUL_WH_CENTERLINES.parts;

// Restore Cho_T1_ㄹ stroke 2
parts['Cho_T1_ㄹ'].m[2] = [
    [155, 535],
    [185, 455],
    [220, 390],
    [340, 392],
    [465, 413]
];

const newContent = 'window.HANGUL_WH_CENTERLINES = ' + JSON.stringify(window.HANGUL_WH_CENTERLINES, null, 2) + ';\n';
fs.writeFileSync('warehouse_centerlines.js', newContent, 'utf8');
console.log('Restored Cho_T1_ㄹ stroke 2 in warehouse_centerlines.js!');
