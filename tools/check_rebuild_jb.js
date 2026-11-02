const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
    if (l.includes('rebuildStrokes') || (i >= 2870 && i <= 2940)) {
        console.log(i + 1, l.slice(0, 110));
    }
});
