const fs = require('fs');

const code = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const window = {};
eval(code);
const parts = window.HANGUL_WH_CENTERLINES.parts;

// Fix Cho_T1_ㄹ stroke 2 to start at left corner [125, 535] and go down vertically
parts['Cho_T1_ㄹ'].m[2] = [
    [125, 535],
    [130, 460],
    [135, 390],
    [340, 392],
    [465, 413]
];

const newContent = 'window.HANGUL_WH_CENTERLINES = ' + JSON.stringify(window.HANGUL_WH_CENTERLINES, null, 2) + ';\n';
fs.writeFileSync('warehouse_centerlines.js', newContent, 'utf8');
console.log('Successfully updated Cho_T1_ㄹ in warehouse_centerlines.js!');
