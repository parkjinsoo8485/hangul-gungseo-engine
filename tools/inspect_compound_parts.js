const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));

const testSyllables = [
    { ch: '화', jung: 'Jung_T2_ㅘ' },
    { ch: '홰', jung: 'Jung_T2_ㅙ' },
    { ch: '획', jung: 'Jung_T2_ㅚ' },
    { ch: '권', jung: 'Jung_T2_ㅝ' },
    { ch: '궤', jung: 'Jung_T2_ㅞ' },
    { ch: '귀', jung: 'Jung_T2_ㅟ' },
    { ch: '흰', jung: 'Jung_T2_ㅢ' },
    { ch: '혼', jung: 'Jung_T2_ㅗ' },
    { ch: '훈', jung: 'Jung_T2_ㅜ' }
];

testSyllables.forEach(({ ch, jung }) => {
    const p = raw.parts[jung];
    console.log(`\n=== ${ch} -> ${jung} ===`);
    console.log('box:', p.box);
    p.medians.forEach((st, i) => {
        const xs = st.map(pt => pt[0]);
        const ys = st.map(pt => pt[1]);
        console.log(` stroke ${i}: x=[${Math.min(...xs)}..${Math.max(...xs)}] y=[${Math.min(...ys)}..${Math.max(...ys)}]`);
    });
});
