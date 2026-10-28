const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

lines.forEach((l, i) => {
    if (l.includes('badge') || l.includes('fillCircle') || l.includes('arc(') || l.includes('fillText(')) {
        if (l.length < 160) console.log((i+1) + ': ' + l.trim());
    }
});
