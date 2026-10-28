const fs = require('fs');
let s = fs.readFileSync('c:/한글획순/warehouse_bridge.js', 'utf8');

const targetStart = s.indexOf('    /** 창고 자소 → { norm: 정규화 획들, wbox: 셀(100단위) 박스 } */');
const targetEnd = s.indexOf('    /** 정밀 모드 여부: 기본 궁서체');

if (targetStart === -1 || targetEnd === -1) {
    console.error('Target bounds not found!');
    process.exit(1);
}

const replacement = `    /** 창고 자소 → { norm: 정규화 획들, wbox: 셀(100단위) 박스 } */
    WH.partNorm = function (id) {
        if (!WH.ready()) return null;
        const p = WH.data.parts[id];
        if (!p) return null;
        const [bx, by, bw, bh] = p.b;
        const strokes = p.m.map(dedupe).filter(s => s.length >= 2);
        const norm = strokes.map((st, si) => {
            const ps = pressureFor(st, si, strokes.length, p.b);
            return st.map(([hx, hy], i) => [
                Math.max(0, Math.min(1, (hx - bx) / bw)),
                Math.max(0, Math.min(1, 1 - (hy - by) / bh)),
                ps[i]
            ]);
        });
        return {
            id, norm,
            wbox: [bx / U, (900 - (by + bh)) / U + WH.Y_SHIFT, bw / U, bh / U]
        };
    };

    /** 복합모음(C형) 분할 정규화: jung_h(ㅗ/ㅜ/ㅡ)와 jung_v(ㅏ/ㅐ/ㅣ/ㅓ/ㅔ)를 각각 타이트한 박스로 분리 */
    WH.partNormCompound = function (id, jungCh) {
        if (!WH.ready()) return null;
        const p = WH.data.parts[id];
        if (!p) return null;
        const strokes = p.m.map(dedupe).filter(s => s.length >= 2);
        const hCount = (jungCh === 'ㅢ') ? 1 : 2;
        if (strokes.length <= hCount) return null;

        const strokesH = strokes.slice(0, hCount);
        const strokesV = strokes.slice(hCount);

        const buildSub = (subStrokes, isH) => {
            const xs = subStrokes.flat().map(pt => pt[0]);
            const ys = subStrokes.flat().map(pt => pt[1]);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);

            let bx, by, bw, bh;
            if (isH) {
                bx = minX - 15;
                bw = Math.max(160, (maxX - minX) + 30);
                if (hCount === 1) {
                    bh = 120;
                    by = Math.round((minY + maxY) * 0.5 - bh * 0.5);
                } else {
                    by = minY - 15;
                    bh = Math.max(130, (maxY - minY) + 30);
                }
            } else {
                by = minY - 15;
                bh = Math.max(200, (maxY - minY) + 30);
                bw = Math.max(140, (maxX - minX) + 30);
                bx = Math.round((minX + maxX) * 0.5 - bw * 0.5);
            }

            const box = [bx, by, bw, bh];
            const norm = subStrokes.map((st, si) => {
                const ps = pressureFor(st, si, subStrokes.length, box);
                return st.map(([hx, hy], i) => [
                    Math.max(0, Math.min(1, (hx - bx) / bw)),
                    Math.max(0, Math.min(1, 1 - (hy - by) / bh)),
                    ps[i]
                ]);
            });
            return {
                norm,
                wbox: [bx / U, (900 - (by + bh)) / U + WH.Y_SHIFT, bw / U, bh / U]
            };
        };

        return {
            h: buildSub(strokesH, true),
            v: buildSub(strokesV, false)
        };
    };

    /** 한 음절 → 엔진 jamoEntries (창고에 없으면 null 반환 → 호출부가 기존 방식으로 대체) */
    WH.buildEntries = function (info, ci, vType, hasJong, opt) {
        if (!WH.ready() || !WH.enabled || info.single) return null;
        opt = opt || {};
        const jongChar = info.jong || '';
        const off = (WH.offsets[info.char] || {});
        const make = (role, ch, forceT) => {
            for (const id of WH.pickIds(role, ch, vType, hasJong, forceT, info.jung)) {
                const pn = WH.partNorm(id);
                if (pn) {
                    const o = off[role] || [0, 0];
                    const wbox = [pn.wbox[0] + o[0], pn.wbox[1] + o[1], pn.wbox[2], pn.wbox[3]];
                    return {
                        ci, norm: pn.norm, wbox, box: wbox, pScale: 1.0, part: role, subPart: role,
                        vType, hasJong, jongChar, whId: id
                    };
                }
            }
            return null;
        };
        const cho = make('cho', info.cho, opt.choT || WH.choT[info.char]);
        if (!cho) return null;

        if (vType === 'C') {
            let jungH = null, jungV = null;
            for (const id of WH.pickIds('jung', info.jung, vType, hasJong, null, info.jung)) {
                const cpn = WH.partNormCompound(id, info.jung);
                if (cpn) {
                    const o = off['jung'] || [0, 0];
                    const wboxH = [cpn.h.wbox[0] + o[0], cpn.h.wbox[1] + o[1], cpn.h.wbox[2], cpn.h.wbox[3]];
                    const wboxV = [cpn.v.wbox[0] + o[0], cpn.v.wbox[1] + o[1], cpn.v.wbox[2], cpn.v.wbox[3]];
                    jungH = {
                        ci, norm: cpn.h.norm, wbox: wboxH, box: wboxH, pScale: 1.0,
                        part: 'jung', subPart: 'jung_h', vType, hasJong, jongChar, whId: id
                    };
                    jungV = {
                        ci, norm: cpn.v.norm, wbox: wboxV, box: wboxV, pScale: 1.0,
                        part: 'jung', subPart: 'jung_v', vType, hasJong, jongChar, whId: id
                    };
                    break;
                }
            }
            if (!jungH || !jungV) return null;
            const jong = hasJong ? make('jong', info.jong) : null;
            if (hasJong && !jong) return null;
            return jong ? [cho, jungH, jungV, jong] : [cho, jungH, jungV];
        }

        const jung = make('jung', info.jung);
        const jong = hasJong ? make('jong', info.jong) : null;
        if (!jung || (hasJong && !jong)) return null;
        return jong ? [cho, jung, jong] : [cho, jung];
    };

`;

s = s.slice(0, targetStart) + replacement + s.slice(targetEnd);
fs.writeFileSync('c:/한글획순/warehouse_bridge.js', s, 'utf8');
console.log('Successfully updated warehouse_bridge.js with C-vowel splitting!');
