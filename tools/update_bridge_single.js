const fs = require('fs');
const path = require('path');

const bridgePath = path.join(__dirname, '..', 'warehouse_bridge.js');
let code = fs.readFileSync(bridgePath, 'utf8');

const regex = /\/\*\*[\s\S]*?\*\/[\s\r\n]*WH\.buildSingleEntry\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?\};/;

const replacement = `/**
     * 단독 자음/모음(info.single): 창고 153개 공인 자소(Cho_T1, Jung_T1, Jong_T1)의
     * 정밀 궁서체 스켈레톤을 단일 정규화 파이프라인으로 추출하여 셀 중앙 바운딩 박스에 매핑.
     */
    WH.buildSingleEntry = function (info, ci) {
        if (!WH.ready() || !WH.enabled || !info.single) return null;
        const ch = info.single;
        let id = null;
        if (WH.data.parts['Cho_T1_' + ch]) id = 'Cho_T1_' + ch;
        else if (WH.data.parts['Jung_T1_' + ch]) id = 'Jung_T1_' + ch;
        else if (WH.data.parts['Jong_T1_' + ch]) id = 'Jong_T1_' + ch;
        if (!id) return null;

        const p = WH.data.parts[id];
        if (!p || !p.m || !p.m.length) return null;
        const strokes = p.m.map(dedupe).filter(s => s.length >= 2);
        if (!strokes.length) return null;

        const allPts = strokes.flat();
        const xs = allPts.map(pt => pt[0]);
        const ys = allPts.map(pt => pt[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const spanX = Math.max(1, maxX - minX);
        const spanY = Math.max(1, maxY - minY);

        const box = [minX, minY, spanX, spanY];
        const norm = strokes.map((st, si) => {
            const ps = pressureFor(st, si, strokes.length, box);
            return st.map(([hx, hy], i) => [
                Math.max(0, Math.min(1, (hx - minX) / spanX)),
                Math.max(0, Math.min(1, 1 - (hy - minY) / spanY)),
                ps[i]
            ]);
        });

        const wbox = [15, 12, 70, 76];
        return {
            ci, norm, wbox, box: wbox, pScale: 1.0, part: 'single', subPart: 'single',
            vType: 'V', hasJong: false, jongChar: '', whId: id
        };
    };`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(bridgePath, code, 'utf8');
    console.log('Successfully updated WH.buildSingleEntry in warehouse_bridge.js');
} else {
    console.log('Regex did not match in warehouse_bridge.js');
}
