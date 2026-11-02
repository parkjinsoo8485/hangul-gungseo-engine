const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
    if (l.includes('maxChoHRight') || (l.includes('part === \'cho\'') && l.includes('vType'))) {
        console.log(i + 1, l.slice(0, 110));
    }
});
