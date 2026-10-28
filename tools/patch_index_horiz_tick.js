const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const targetShiftY = `                const maxShiftY = isCLeftJung ? 7.5 : Math.min(4.2, Math.max(2.5, strokeSpan * 0.45));`;

const replShiftY = `                const isHorizJungTick = (e.part === 'jung' && spanY < 2.0 && spanX > 2.5);
                const maxShiftY = (isCLeftJung || isHorizJungTick) ? 10.0 : Math.min(4.2, Math.max(2.5, strokeSpan * 0.45));`;

if (!html.includes(targetShiftY)) {
    console.error('Target ShiftY not found!');
    process.exit(1);
}
html = html.replace(targetShiftY, replShiftY);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully patched maxShiftY for horiz jung ticks in index.html!');
