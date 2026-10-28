const fs = require('fs');

const code = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const window = {};
eval(code);
const parts = window.HANGUL_WH_CENTERLINES.parts;

// Straighten stroke 2 of Jong_T1_ㄼ and Jong_T1_ㄾ
parts['Jong_T1_ㄼ'].m[2] = [
    [270, 260],
    [270, 195],
    [275, 138],
    [405, 138],
    [495, 152]
];

parts['Jong_T1_ㄾ'].m[2] = [
    [270, 260],
    [270, 195],
    [275, 138],
    [410, 138],
    [495, 155]
];

const newContent = 'window.HANGUL_WH_CENTERLINES = ' + JSON.stringify(window.HANGUL_WH_CENTERLINES, null, 2) + ';\n';
fs.writeFileSync('warehouse_centerlines.js', newContent, 'utf8');
console.log('Successfully straightened Jong_T1_ㄼ and Jong_T1_ㄾ in warehouse_centerlines.js!');
