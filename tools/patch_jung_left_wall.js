const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
const crlf = code.includes('\r\n');
const norm = s => s.replace(/\r\n/g, '\n');

const t = `                        } else if (e.subPart === 'jung_v') {
                            // 세로모음(ㅏ/ㅐ/ㅣ/ㅓ/ㅔ): splitX 우측 전체 영역
                            const isLeftTick = ['ㅓ', 'ㅕ', 'ㅔ', 'ㅖ', 'ㅞ'].some(v => (e.whId || e.char || '').includes(v));
                            const jungLeftWall = isLeftTick ? splitX - 3.0 : splitX + 0.5;
                            const actMaxX = jb.maxX / s;
                            if (e.fbox[0] < jungLeftWall) {
                                e.fbox[0] = jungLeftWall;
                            }`;

const r = `                        } else if (e.subPart === 'jung_v') {
                            // 세로모음(ㅏ/ㅐ/ㅣ/ㅓ/ㅔ): splitX 우측 전체 영역
                            const isDoubleStem = ['ㅙ', 'ㅞ'].some(v => (e.whId || e.char || '').includes(v));
                            const isLeftTick = ['ㅓ', 'ㅕ', 'ㅔ', 'ㅖ', 'ㅞ'].some(v => (e.whId || e.char || '').includes(v));
                            const jungLeftWall = isDoubleStem ? (splitX - 1.0) : (isLeftTick ? splitX - 3.0 : splitX + 0.5);
                            const actMaxX = jb.maxX / s;
                            if (e.fbox[0] < jungLeftWall) {
                                e.fbox[0] = jungLeftWall;
                            }`;

let cNorm = norm(code);
if (!cNorm.includes(norm(t))) console.error('Target not found');
else {
    cNorm = cNorm.replace(norm(t), norm(r));
    fs.writeFileSync('index.html', crlf ? cNorm.replace(/\n/g, '\r\n') : cNorm);
    console.log('Successfully replaced jungLeftWall');
}
