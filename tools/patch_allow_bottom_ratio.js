const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

const oldAllow = `const allowBottom = !jb.hasJong && ly > 175;`;
const newAllow = `const allowBottom = !jb.hasJong && ly > (jb.choY1 + (jb.choY2 - jb.choY1) * 0.55);`;

if (html.includes(oldAllow)) {
    html = html.replace(oldAllow, newAllow);
    console.log('Patched allowBottom to dynamic ratio');
    fs.writeFileSync('index.html', html.replace(/\n/g, '\r\n'), 'utf8');
} else {
    console.log('Could not find oldAllow');
}
