const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

const oldV = `                            } else if (mk.part === 'jung') {
                                const isVert = Math.abs(pty[starts[k]]) > 0.72;
                                if (isVert && lx < jb.splitX - 3 && ly > 80) dist += 1e7;
                                if (jb.hasJong && strokeEndLy[sId] < 1e5 && ly > strokeEndLy[sId] + 3) dist += 1e7;
                            }`;

const newV = `                            } else if (mk.part === 'jung') {
                                if (lx < jb.splitX - 3) dist += 1e7;
                                if (jb.hasJong && strokeEndLy[sId] < 1e5 && ly > strokeEndLy[sId] + 3) dist += 1e7;
                            }`;

// Also for C
const oldC = `                            } else if (mk.part === 'jung') {
                                if (jb.hasJong && ly > jb.jongY1 + 3 && lx < jb.splitX) dist += 1e7;
                            }`;

const newC = `                            } else if (mk.part === 'jung') {
                                if (mk.subPart === 'jung_v' && lx < jb.splitX - 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.jongY1 + 3 && lx < jb.splitX) dist += 1e7;
                            }`;

let patched = html;
if (patched.includes(oldV)) {
    patched = patched.replace(oldV, newV);
    console.log('Patched V');
} else console.log('Could not find oldV');

if (patched.includes(oldC)) {
    patched = patched.replace(oldC, newC);
    console.log('Patched C');
} else console.log('Could not find oldC');

fs.writeFileSync('index.html', patched.replace(/\n/g, '\r\n'), 'utf8');
