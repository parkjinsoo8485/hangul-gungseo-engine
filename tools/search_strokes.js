const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

lines.forEach((l, i) => {
    if (l.includes('.strokes =') || l.includes('this.strokes')) {
        if (l.length < 160) console.log((i+1) + ': ' + l.trim());
    }
});
