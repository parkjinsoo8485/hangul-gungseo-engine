const fontkit = require('./node_modules/fontkit');
const fs = require('fs');

const collection = fontkit.openSync('C:/Windows/Fonts/batang.ttc');
const gungsuh = collection.fonts[2];
const glyph = gungsuh.glyphForCodePoint('가'.charCodeAt(0));

// Extract Subpath 2 (초성 'ㄱ')
let choCommands = [];
let count = 0;
for (const cmd of glyph.path.commands) {
    if (cmd.command === 'moveTo') {
        count++;
    }
    if (count === 2) {
        choCommands.push(cmd);
    }
}

console.log('=== Cho ㄱ Commands Details ===');
choCommands.forEach((c, idx) => {
    console.log(`${idx}: ${c.command} [${c.args.join(', ')}]`);
});
