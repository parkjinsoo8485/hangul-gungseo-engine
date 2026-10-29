const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
    if (l.includes('fontVal') || l.includes('fontFamily') || l.includes('@font-face') || l.includes('select') && l.includes('font')) {
        console.log(i + 1, l.slice(0, 100));
    }
});
