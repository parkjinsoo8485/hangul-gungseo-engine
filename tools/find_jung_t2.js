const fs = require('fs');

// Let's examine how Jung_T2_ㅜ is placed in index.html when syllable is '궁' or any Cho + ㅜ + Jong.
// Let's search index.html for where Jung_T2_ㅜ or Jung_T2 or vType === 'H' is positioned and transformed.
const html = fs.readFileSync('index.html', 'utf8');

// Find references to computeDynamicJamoBounds or fitWhToBox or vowel bounds calculation
const lines = html.split('\n');
lines.forEach((l, i) => {
    if (l.includes('Jung_T2_ㅜ') || (l.includes('Jung_T2') && l.includes('case')) || l.includes('vType === \'H\'') || l.includes('vType === "H"')) {
        console.log(i + 1, l.slice(0, 110));
    }
});
