const opentype = require('opentype.js');
const fs = require('fs');

const fontPath = 'C:/Windows/Fonts/batang.ttc';
console.log('Reading:', fontPath);

// opentype.loadSync does not always handle TTC collections out of the box,
// let us see how opentype handles it or if we need to load specific font index.
try {
    const buffer = fs.readFileSync(fontPath);
    // In OpenType.js, buffer can be parsed. If TTC, opentype.parse has fontIndex support or TTC headers.
    console.log('Buffer size:', buffer.length);
    
    // Check TTC header
    const tag = buffer.toString('utf8', 0, 4);
    console.log('Header tag:', tag); // 'ttcf' for TrueType Collection

    if (tag === 'ttcf') {
        const numFonts = buffer.readUInt32BE(8);
        console.log('Number of fonts in TTC:', numFonts);
        for (let i = 0; i < numFonts; i++) {
            const offset = buffer.readUInt32BE(12 + i * 4);
            try {
                // opentype.parse(buffer, { fontIndex: i })
                // Let's test if opentype supports fontIndex
                const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), { fontIndex: i });
                const name = font.names.fontFamily ? (font.names.fontFamily.ko || font.names.fontFamily.en) : 'Unknown';
                const subFamily = font.names.fontSubfamily ? (font.names.fontSubfamily.en || '') : '';
                console.log(`Font [${i}]: ${name} (${subFamily})`);
            } catch (err) {
                console.log(`Font [${i}] parse error:`, err.message);
            }
        }
    }
} catch (e) {
    console.error('Error:', e);
}
