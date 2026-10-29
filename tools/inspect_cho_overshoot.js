const fs = require('fs');
const defects = JSON.parse(fs.readFileSync('tools/super_precision_defects.json', 'utf8'));

const choOver = defects.filter(d => d.type === 'CHO_OVERSHOOT_INTO_VOWEL');
console.log('CHO_OVERSHOOT count:', choOver.length);
console.log('Sample CHO_OVERSHOOT:', JSON.stringify(choOver.slice(0, 5), null, 2));
