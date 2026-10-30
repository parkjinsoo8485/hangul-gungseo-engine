const fs = require('fs');
const c = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const missing = CHO.filter(ch => !c.includes('"Cho_T2_' + ch + '"'));
console.log('Missing Cho_T2:', missing);
const foundT1 = CHO.filter(ch => c.includes('"Cho_T1_' + ch + '"'));
console.log('Found Cho_T1:', foundT1.length);
