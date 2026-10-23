const fs = require('fs');
let s = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

const oldShift = `                const isVertSt = Math.abs(st[st.length - 1][1] - st[0][1]) > Math.abs(st[st.length - 1][0] - st[0][0]);
                const maxShiftX = (e.part === 'cho' && e.vType === 'H') ? 6 : (e.part === 'jung' && isVertSt ? 18 : 10);
                const maxShiftY = (e.part === 'cho' && e.vType === 'H') ? 4 : (e.part === 'jung' && !isVertSt ? 16 : 10);`;

const newShift = `                const spanX = Math.abs(st[st.length - 1][0] - st[0][0]) * b[2];
                const spanY = Math.abs(st[st.length - 1][1] - st[0][1]) * b[3];
                const maxShiftX = Math.min(3.5, Math.max(1.0, spanX * 0.45));
                const maxShiftY = Math.min(3.5, Math.max(1.0, spanY * 0.45));`;

if (s.includes(oldShift)) {
    s = s.replace(oldShift, newShift);
    console.log('Replaced oldShift (LF)');
} else if (s.includes(oldShift.replace(/\n/g, '\r\n'))) {
    s = s.replace(oldShift.replace(/\n/g, '\r\n'), newShift.replace(/\n/g, '\r\n'));
    console.log('Replaced oldShift (CRLF)');
} else {
    console.log('oldShift not found');
}

fs.writeFileSync('c:/project/한글획순/index.html', s, 'utf8');
console.log('Saved index.html limit stroke shift patch!');
