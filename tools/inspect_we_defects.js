const fs = require('fs');
const defects = JSON.parse(fs.readFileSync('tools/super_precision_defects.json', 'utf8'));

const we1 = defects.filter(d => d.whId === 'Jung_T1_ㅞ');
console.log('Jung_T1_ㅞ defects count:', we1.length);
console.log('Jung_T1_ㅞ sample:', JSON.stringify(we1.slice(0, 3), null, 2));

const we2 = defects.filter(d => d.whId === 'Jung_T2_ㅞ');
console.log('\nJung_T2_ㅞ defects count:', we2.length);
console.log('Jung_T2_ㅞ sample:', JSON.stringify(we2.slice(0, 3), null, 2));
