const fs = require('fs');
global.window = global;
require('../warehouse_centerlines.js');
require('../warehouse_bridge.js');

const parts = HANGUL_WH_CENTERLINES.parts;

console.log('=== All 4-stroke Cho parts ===');
for (const [id, p] of Object.entries(parts)) {
    if (p.r === 'cho' && p.m.length === 4) {
        const pn = WH.partNorm(id);
        console.log(`${id} (${p.c}) wbox=${pn.wbox.map(v => v.toFixed(1))}`);
        p.m.forEach((st, i) => {
            const ux = st[0][0] / 10.24;
            const uy = (900 - st[0][1]) / 10.24 + WH.Y_SHIFT;
            const ex = st[st.length-1][0] / 10.24;
            const ey = (900 - st[st.length-1][1]) / 10.24 + WH.Y_SHIFT;
            console.log(`  s${i}: start=(${ux.toFixed(1)}, ${uy.toFixed(1)}) end=(${ex.toFixed(1)}, ${ey.toFixed(1)})`);
        });
    }
}

console.log('\n=== All 3-stroke Jong parts ===');
for (const [id, p] of Object.entries(parts)) {
    if (p.r === 'jong' && p.m.length === 3) {
        const pn = WH.partNorm(id);
        console.log(`${id} (${p.c}) wbox=${pn.wbox.map(v => v.toFixed(1))}`);
        p.m.forEach((st, i) => {
            const ux = st[0][0] / 10.24;
            const uy = (900 - st[0][1]) / 10.24 + WH.Y_SHIFT;
            const ex = st[st.length-1][0] / 10.24;
            const ey = (900 - st[st.length-1][1]) / 10.24 + WH.Y_SHIFT;
            console.log(`  s${i}: start=(${ux.toFixed(1)}, ${uy.toFixed(1)}) end=(${ex.toFixed(1)}, ${ey.toFixed(1)})`);
        });
    }
}
