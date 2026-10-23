const fs = require('fs');
let s = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

const oldCPenalty = `                        } else if (jb.vType === 'C') {
                            if (jb.hasJong && mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (ly > jb.choY2 + 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                if (lx < jb.splitX - 3 && ly < jb.choY2 - 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.jongY1 + 3 && lx < jb.splitX) dist += 1e7;
                            }
                        }`;

const newCPenalty = `                        } else if (jb.vType === 'C') {
                            if (jb.hasJong && mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.jongY1 - 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                if (jb.hasJong && ly > jb.jongY1 + 3 && lx < jb.splitX) dist += 1e7;
                            }
                        }`;

if (s.includes(oldCPenalty)) {
    s = s.replace(oldCPenalty, newCPenalty);
    console.log('Replaced oldCPenalty (LF)');
} else if (s.includes(oldCPenalty.replace(/\n/g, '\r\n'))) {
    s = s.replace(oldCPenalty.replace(/\n/g, '\r\n'), newCPenalty.replace(/\n/g, '\r\n'));
    console.log('Replaced oldCPenalty (CRLF)');
} else {
    console.log('oldCPenalty not found');
}

fs.writeFileSync('c:/project/한글획순/index.html', s, 'utf8');
console.log('Saved index.html remove C penalty!');
