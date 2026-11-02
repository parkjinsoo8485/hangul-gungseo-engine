const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Normalize CRLF to LF for reliable patching, then back to CRLF
const hasCRLF = html.includes('\r\n');
if (hasCRLF) html = html.replace(/\r\n/g, '\n');

// Patch 1: isO height clamp in line 2673
const old1 = 'e.fbox[3] = Math.max(9, Math.min(13, (barY + 2.5) - e.fbox[1]));';
const new1 = 'e.fbox[3] = Math.max(14, (barY + 2.0) - e.fbox[1]);';
if (!html.includes(old1)) {
    console.error('Target 1 not found!');
    process.exit(1);
}
html = html.replace(old1, new1);

// Patch 2: choY2 detection for isO
const old2 = `        let yCho = maxChoY, minYCho = 1e9;
        const ycStart = Math.round(minY + Hc * (hasJong ? 0.32 : 0.38));
        const ycEnd = maxChoY;
        for (let y = ycStart; y <= ycEnd; y++) {
            let rowLeft = 0;
            for (let x = minX; x <= xSplit - 2; x++) {
                if (img[(y * W + ci * R + x) * 4 + 3] > 50) rowLeft++;
            }
            if (rowLeft < minYCho) { minYCho = rowLeft; yCho = y; }
        }`;

const new2 = `        let yCho = maxChoY, minYCho = 1e9;
        const ycStart = Math.round(minY + Hc * (hasJong ? 0.32 : (isO ? 0.44 : 0.38)));
        const ycEnd = maxChoY;
        if (isO && !hasJong) {
            let foundTransition = -1;
            for (let y = maxChoY; y >= ycStart; y--) {
                let rowLeft = 0;
                for (let x = minX; x <= xSplit - 2; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) rowLeft++;
                }
                if (rowLeft >= 40) {
                    foundTransition = Math.min(maxChoY, y + 2);
                    break;
                }
            }
            yCho = (foundTransition > 0) ? foundTransition : Math.round(minY + Hc * 0.48);
        } else {
            for (let y = ycStart; y <= ycEnd; y++) {
                let rowLeft = 0;
                for (let x = minX; x <= xSplit - 2; x++) {
                    if (img[(y * W + ci * R + x) * 4 + 3] > 50) rowLeft++;
                }
                if (rowLeft < minYCho) { minYCho = rowLeft; yCho = y; }
            }
        }`;

if (!html.includes(old2)) {
    console.error('Target 2 not found!');
    process.exit(1);
}
html = html.replace(old2, new2);

// Patch 3: prevent cho horizontal stroke overshooting splitX into vowel stem
const old3 = "if (isLastH && meta.part === 'cho' && meta.vType !== 'H' && lx100 > 62.2) break;";
const new3 = `if (isLastH && meta.part === 'cho') {
                                const maxChoHRight = (meta.vType === 'C' || meta.vType === 'V') ? (splitX - 0.2) : 62.2;
                                if (lx100 > maxChoHRight) break;
                            }`;
if (!html.includes(old3)) {
    console.error('Target 3 not found!');
    process.exit(1);
}
html = html.replace(old3, new3);

if (hasCRLF) html = html.replace(/\n/g, '\r\n');
fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully patched index.html for isO choY2, fbox height, and cho overshoot!');
