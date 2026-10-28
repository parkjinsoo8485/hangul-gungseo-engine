const fs = require('fs');

const code = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const window = {};
eval(code);
const parts = window.HANGUL_WH_CENTERLINES.parts;

// Straighten the vertical line of Jong_T2_ㅌ
parts['Jong_T2_ㅌ'].m[2] = [
    [380, 300],
    [380, 200],
    [385, 108],
    [535, 105],
    [655, 118]
];

// Also check Jong_T2_ㄹ
// [ [ 355, 695 ], [ 375, 630 ], [ 395, 575 ], [ 540, 572 ], [ 680, 588 ] ]
// Straighten Jong_T2_ㄹ vertical line:
parts['Jong_T2_ㄹ'].m[2] = [
    [355, 695],
    [355, 630],
    [360, 575],
    [540, 572],
    [680, 588]
];

const newContent = 'window.HANGUL_WH_CENTERLINES = ' + JSON.stringify(window.HANGUL_WH_CENTERLINES, null, 2) + ';\n';
fs.writeFileSync('warehouse_centerlines.js', newContent, 'utf8');
console.log('Successfully straightened Jong_T2_ㅌ and Jong_T2_ㄹ in warehouse_centerlines.js!');
