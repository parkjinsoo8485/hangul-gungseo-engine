const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const hasCRLF = html.includes('\r\n');
if (hasCRLF) html = html.replace(/\r\n/g, '\n');

// Target: rowLeft >= 40
const oldStr = 'if (rowLeft >= 40) {';
const newStr = 'if (rowLeft >= Math.round((xSplit - minX) * 0.35)) {';

if (!html.includes(oldStr)) {
    console.error('oldStr not found!');
    process.exit(1);
}
html = html.replace(oldStr, newStr);

if (hasCRLF) html = html.replace(/\n/g, '\r\n');
fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated threshold to resolution-independent ratio!');
