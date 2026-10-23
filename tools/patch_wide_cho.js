const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

const oldEnd = `const xEnd = Math.round(minX + (maxX - minX) * 0.70);`;
const newEnd = `const isWideCho = (info.cho === 'ㅁ' || info.cho === 'ㅂ' || info.cho === 'ㅃ' || info.cho === 'ㅍ');
        const xEnd = Math.round(minX + (maxX - minX) * (isWideCho ? 0.70 : 0.58));`;

if (html.includes(oldEnd)) {
    html = html.replace(oldEnd, newEnd);
    console.log('Patched isWideCho');
    fs.writeFileSync('index.html', html.replace(/\n/g, '\r\n'), 'utf8');
} else {
    console.log('Could not find oldEnd');
}
