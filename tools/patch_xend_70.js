const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

const oldEnd = `const xEnd = Math.round(minX + (maxX - minX) * (isDoubleCho ? 0.70 : 0.58));`;
const newEnd = `const xEnd = Math.round(minX + (maxX - minX) * 0.70);`;

if (html.includes(oldEnd)) {
    html = html.replace(oldEnd, newEnd);
    console.log('Patched xEnd to 0.70');
    fs.writeFileSync('index.html', html.replace(/\n/g, '\r\n'), 'utf8');
} else {
    console.log('Could not find oldEnd');
}
