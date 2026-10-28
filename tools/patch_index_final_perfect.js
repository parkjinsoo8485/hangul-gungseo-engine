const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. In fitEntriesToGlyph for C-type jung_v: cap targetRight at (jb.maxX / s) + 0.5 to prevent extending past glyph
const targetJVRight = `                            const targetRight = Math.max(e.fbox[0] + e.fbox[2], actMaxX + 1.0);
                            e.fbox[2] = Math.max(14, targetRight - e.fbox[0]);`;

const replJVRight = `                            const targetRight = Math.max(e.fbox[0] + 14, Math.min(e.fbox[0] + e.fbox[2], actMaxX + 0.5));
                            e.fbox[2] = Math.max(14, targetRight - e.fbox[0]);`;

if (!html.includes(targetJVRight)) {
    console.error('Target JVRight not found!');
    process.exit(1);
}
html = html.replace(targetJVRight, replJVRight);

// 2. In entriesToRaw coordinate descent: limit maxShiftX for purely vertical jung ticks (ㅜ, ㅗ, ㅠ, ㅛ)
const targetShift = `                const strokeSpan = Math.hypot(spanX, spanY);
                const maxShiftX = Math.min(4.2, Math.max(2.5, strokeSpan * 0.45));`;

const replShift = `                const strokeSpan = Math.hypot(spanX, spanY);
                const isVertJungTick = (e.part === 'jung' && spanX < 1.5 && spanY > 4.0);
                const maxShiftX = isVertJungTick ? 1.0 : Math.min(4.2, Math.max(2.5, strokeSpan * 0.45));`;

if (!html.includes(targetShift)) {
    console.error('Target Shift not found!');
    process.exit(1);
}
html = html.replace(targetShift, replShift);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully patched index.html with perfection fixes!');
