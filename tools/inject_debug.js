const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const needle = 'D[p * K + k] = dist; Ix[p * K + k] = bi;';
const injection = needle + `
if (pxX[p] === 50 && pxY[p] === 210) console.log('DEBUG_PIX k=' + k + ' dist=' + dist + ' bi=' + bi + ' pu=' + pu[bi]);`;
html = html.replace(needle, injection);

// Also log at owner decision
const needle2 = 'owners[p] = owner;';
const injection2 = needle2 + `
if (pxX[p] === 50 && pxY[p] === 210) console.log('DEBUG_OWNER p=(50,210) owner=' + owner + ' effN=' + Array.from(effN).map(x => Math.round(x*100)/100));`;
html = html.replace(needle2, injection2);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Injected debug logs');
