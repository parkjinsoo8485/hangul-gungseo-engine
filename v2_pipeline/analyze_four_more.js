const fontkit = require('./node_modules/fontkit');
const fs = require('fs');

const collection = fontkit.openSync('C:/Windows/Fonts/batang.ttc');
const gungsuh = collection.fonts[2];

function analyzeGlyph(ch) {
    const glyph = gungsuh.glyphForCodePoint(ch.charCodeAt(0));
    const path = glyph.path;

    const subpaths = [];
    let current = [];
    for (const cmd of path.commands) {
        if (cmd.command === 'moveTo') {
            if (current.length) subpaths.push(current);
            current = [cmd];
        } else {
            current.push(cmd);
        }
    }
    if (current.length) subpaths.push(current);

    console.log(`\n=== Character: ${ch} (Subpaths: ${subpaths.length}) ===`);
    subpaths.forEach((sp, idx) => {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        sp.forEach(cmd => {
            const a = cmd.args;
            if (!a) return;
            for (let i = 0; i < a.length; i += 2) {
                if (a[i] < minX) minX = a[i];
                if (a[i] > maxX) maxX = a[i];
                if (a[i+1] < minY) minY = a[i+1];
                if (a[i+1] > maxY) maxY = a[i+1];
            }
        });
        console.log(`Subpath ${idx + 1}:`);
        console.log(`  BBox: X [${minX.toFixed(1)} ~ ${maxX.toFixed(1)}], Y [${minY.toFixed(1)} ~ ${maxY.toFixed(1)}]`);
        console.log(`  Width: ${(maxX - minX).toFixed(1)}, Height: ${(maxY - minY).toFixed(1)}`);
    });
}

['마', '바', '사', '아'].forEach(analyzeGlyph);
