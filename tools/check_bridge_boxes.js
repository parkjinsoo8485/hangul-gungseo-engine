const fs = require('fs');
let codeWH = fs.readFileSync('warehouse_centerlines.js', 'utf8');
let codeBridge = fs.readFileSync('warehouse_bridge.js', 'utf8');
const window = {
    location: { search: '' }
};
const document = {
    addEventListener: () => {}
};
eval(codeWH);
eval(codeBridge);

const WH = window.WH;
console.log('WH ready:', WH.ready());
['Jung_T1_ㅞ', 'Jung_T2_ㅞ', 'Jung_T1_ㅙ', 'Jung_T2_ㅙ'].forEach(id => {
    const ch = id.slice(-1);
    const res = WH.partNormCompound(id, ch);
    console.log(id);
    console.log('  H wbox:', res.h.wbox.map(v => v.toFixed(2)));
    console.log('  V wbox:', res.v.wbox.map(v => v.toFixed(2)));
    console.log('  V norm strokes count:', res.v.norm.length);
    res.v.norm.forEach((st, i) => {
        console.log(`    s${i} first: [${st[0][0].toFixed(2)}, ${st[0][1].toFixed(2)}] last: [${st[st.length-1][0].toFixed(2)}, ${st[st.length-1][1].toFixed(2)}]`);
    });
});
