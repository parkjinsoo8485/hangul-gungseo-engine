const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

const oldChoV = `                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.choY2 + 3) dist += 1e7;
                            }`;

const newChoV = `                            if (mk.part === 'cho') {
                                const allowBottom = !jb.hasJong && ly > 175;
                                if (lx > jb.splitX + 3 && !allowBottom) dist += 1e7;
                                if (jb.hasJong && ly > jb.choY2 + 3) dist += 1e7;
                            }`;

if (html.includes(oldChoV)) {
    html = html.replace(oldChoV, newChoV);
    console.log('Patched choV in buildGlyphData');
    fs.writeFileSync('index.html', html.replace(/\n/g, '\r\n'), 'utf8');
} else {
    console.log('Could not find oldChoV');
}
