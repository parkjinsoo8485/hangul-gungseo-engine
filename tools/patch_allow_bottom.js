const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

const target = `                        } else if (jb.vType === 'V') {
                            if (mk.part === 'cho') {
                                const allowBottom = !jb.hasJong && ly > (jb.choY1 + (jb.choY2 - jb.choY1) * 0.55);
                                if (lx > jb.splitX + 3 && !allowBottom) dist += 1e7;
                                if (jb.hasJong && ly > jb.choY2 + 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                if (lx < jb.splitX - 3) dist += 1e7;
                                if (ptx[starts[k]] > 0.5 && lx < px[starts[k]] - 2) dist += 1e7;
                                if (jb.hasJong && strokeEndLy[sId] < 1e5 && ly > strokeEndLy[sId] + 3) dist += 1e7;
                            } else if (mk.part === 'jong') {`;

const repl = `                        } else if (jb.vType === 'V') {
                            const isChoConnBottom = ['ㄷ', 'ㅌ', 'ㄹ'].some(c => (mk.whId || (metaK[0] && metaK[0].whId) || '').includes(c)) && ly >= (jb.choY1 + (jb.choY2 - jb.choY1) * 0.45);
                            if (mk.part === 'cho') {
                                const maxChoX = isChoConnBottom ? (jb.stemX_V ? jb.stemX_V - 2 : jb.splitX + 45) : (jb.splitX + 3);
                                const allowBottom = !jb.hasJong && ly > (jb.choY1 + (jb.choY2 - jb.choY1) * 0.55);
                                if (lx > maxChoX && !allowBottom) dist += 1e7;
                                if (jb.hasJong && ly > jb.choY2 + 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                const choHasConn = ['ㄷ', 'ㅌ', 'ㄹ'].some(c => (metaK[0] && metaK[0].whId || '').includes(c));
                                if (choHasConn && isChoConnBottom && lx < (jb.stemX_V ? jb.stemX_V - 3 : jb.splitX + 35)) {
                                    dist += 1e7; // 중성이 초성 ㄷ/ㅌ/ㄹ의 하단 가로 주간선을 침범하는 것을 차단
                                }
                                if (lx < jb.splitX - 3) dist += 1e7;
                                if (ptx[starts[k]] > 0.5 && lx < px[starts[k]] - 2) dist += 1e7;
                                if (jb.hasJong && strokeEndLy[sId] < 1e5 && ly > strokeEndLy[sId] + 3) dist += 1e7;
                            } else if (mk.part === 'jong') {`;

const normCode = code.replace(/\r?\n/g, '\n');
const normT = target.replace(/\r?\n/g, '\n');
const normR = repl.replace(/\r?\n/g, '\n');

if (!normCode.includes(normT)) {
    console.error('Target not found!');
    process.exit(1);
}

let patched = normCode.replace(normT, normR);
// Bump cache buster
patched = patched.replace(/warehouse_centerlines\.js\?v=[0-9_]+/g, 'warehouse_centerlines.js?v=20261029_1130');
fs.writeFileSync('index.html', patched, 'utf8');
console.log('Successfully patched index.html with isChoConnBottom rule');
