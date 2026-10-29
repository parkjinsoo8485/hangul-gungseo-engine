const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
    if (l.includes('glyphData =') || l.includes('glyphData.idx')) {
        console.log(i + 1, l.slice(0, 110));
    }
});
