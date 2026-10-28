const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const lines = html.split('\n');
lines.forEach((l, i) => {
    if (l.includes('getJamoStrokes') || l.includes('const JAMO') || l.includes('let JAMO') || l.includes('var JAMO')) {
        console.log((i+1) + ': ' + l.trim());
    }
});
