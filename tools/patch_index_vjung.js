const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const targetVJung = `                    } else if (e.part === 'jung') {
                        const isLeftTick = ['ㅓ', 'ㅔ', 'ㅕ', 'ㅖ'].some(v => (e.whId || e.char || '').includes(v));
                        const jungLeftWall = isLeftTick ? splitX - 3.5 : splitX + 0.5;
                        if (e.fbox[0] < jungLeftWall) {
                            const right = e.fbox[0] + e.fbox[2];
                            e.fbox[0] = jungLeftWall;
                            e.fbox[2] = Math.max(14, right - e.fbox[0]);
                        }
                    }`;

const replVJung = `                    } else if (e.part === 'jung') {
                        const isLeftTick = ['ㅓ', 'ㅔ', 'ㅕ', 'ㅖ'].some(v => (e.whId || e.char || '').includes(v));
                        const jungLeftWall = isLeftTick ? splitX - 3.5 : splitX + 0.5;
                        if (e.fbox[0] < jungLeftWall) {
                            e.fbox[0] = jungLeftWall;
                        }
                        const actMaxX = jb.maxX / s;
                        const targetRight = Math.max(e.fbox[0] + 14, Math.min(e.fbox[0] + e.fbox[2], actMaxX + 0.5));
                        e.fbox[2] = Math.max(14, targetRight - e.fbox[0]);
                    }`;

if (!html.includes(targetVJung)) {
    console.error('Target VJung not found!');
    process.exit(1);
}
html = html.replace(targetVJung, replVJung);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully patched V-type jung clamping in index.html!');
