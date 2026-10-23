const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));

const targetIds = [
    'Jung_T1_ㅜ', 'Jung_T2_ㅜ',
    'Jung_T1_ㅗ', 'Jung_T2_ㅗ',
    'Jung_T1_ㅚ', 'Jung_T2_ㅚ',
    'Jung_T1_ㅘ', 'Jung_T2_ㅘ',
    'Jung_T1_ㅙ', 'Jung_T2_ㅙ',
    'Jung_T1_ㅝ', 'Jung_T2_ㅝ',
    'Jung_T1_ㅞ', 'Jung_T2_ㅞ',
    'Jung_T1_ㅟ', 'Jung_T2_ㅟ',
    'Jung_T1_ㅢ', 'Jung_T2_ㅢ'
];

targetIds.forEach(id => {
    const p = raw.parts[id];
    if (!p) return;
    console.log(`\n=== ${id} (${p.char}, T${p.formType}) ===`);
    console.log('box:', p.box);
    console.log('outlineBounds:', p.outlineBounds);
    console.log('medians:');
    p.medians.forEach((st, i) => console.log(`   stroke ${i}: len=${st.length}`, JSON.stringify(st)));
});
