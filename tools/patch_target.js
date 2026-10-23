const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target = `                    } else if (e.part === 'jung') {
                        if (jb.hasJong && ['ㅝ', 'ㅞ', 'ㅟ'].includes(e.char)) {
                            if (e.fbox[1] + e.fbox[3] < jongY1 - 1) {
                                e.fbox[3] = Math.max(e.fbox[3], jongY1 - 0.5 - e.fbox[1]);
                            }
                        }
                    } else if (e.part === 'jong') {`;

const replace = `                    } else if (e.part === 'jung') {
                        if (jb.hasJong && ['ㅝ', 'ㅞ', 'ㅟ'].some(v => (e.whId || e.char || '').includes(v))) {
                            if (e.fbox[1] + e.fbox[3] < jongY1 - 1) {
                                e.fbox[3] = Math.max(e.fbox[3], jongY1 - 0.5 - e.fbox[1]);
                            }
                        }
                    } else if (e.part === 'jong') {`;

code = code.replace(/\r\n/g, '\n');
const targetLF = target.replace(/\r\n/g, '\n');
const replaceLF = replace.replace(/\r\n/g, '\n');

if (!code.includes(targetLF)) {
    console.error('Target not found!');
    process.exit(1);
}
code = code.replace(targetLF, replaceLF);
code = code.replace(/\n/g, '\r\n');
fs.writeFileSync('index.html', code, 'utf8');
console.log('Fixed e.whId check!');
