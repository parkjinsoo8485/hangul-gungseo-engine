const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Let's run a script that tests the exact effect of updating:
// 1. b.stemX_C = stemX in computeDynamicJamoBounds
// 2. e.fbox[2] for jung_h in fitEntriesToGlyph
// 3. straight stroke extension in buildGlyphCenterlines
// 4. isVerticalJung in buildGlyphData
console.log('Testing Hoe fix concept...');
