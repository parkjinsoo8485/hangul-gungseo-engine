const fs = require('fs');

// Read current warehouse_centerlines.js
let content = fs.readFileSync('c:/project/한글획순/warehouse_centerlines.js', 'utf8');
const dataStr = content.replace(/^\/\*.*?\*\/\s*window\.HANGUL_WH_CENTERLINES\s*=\s*/s, '').replace(/;\s*$/, '');
const wh = JSON.parse(dataStr);

// 1. Jung_T2_ㅚ
wh.parts['Jung_T2_ㅚ'] = {
    c: "ㅚ", r: "jung", t: 2,
    b: [160, 380, 780, 540],
    m: [
        [[480, 550], [490, 460]],
        [[180, 445], [450, 460], [710, 445]],
        [[689, 879], [728, 650], [715, 407]]
    ],
    w: [31, 31, 32]
};

// 2. Jung_T2_ㅘ
wh.parts['Jung_T2_ㅘ'] = {
    c: "ㅘ", r: "jung", t: 2,
    b: [160, 380, 780, 540],
    m: [
        [[480, 550], [490, 460]],
        [[180, 445], [450, 460], [620, 445]],
        [[632, 879], [719, 636], [654, 400]],
        [[664, 651], [702, 660], [792, 659]]
    ],
    w: [31, 31, 32, 32]
};

// 3. Jung_T2_ㅙ
wh.parts['Jung_T2_ㅙ'] = {
    c: "ㅙ", r: "jung", t: 2,
    b: [160, 380, 780, 540],
    m: [
        [[480, 550], [490, 460]],
        [[180, 445], [450, 460], [620, 445]],
        [[706, 851], [630, 626], [734, 433]],
        [[657, 653], [665, 667], [758, 651]],
        [[715, 860], [720, 650], [736, 430]]
    ],
    w: [31, 31, 32, 32, 32]
};

// 4. Jung_T1_ㅜ (stem centered on bar)
wh.parts['Jung_T1_ㅜ'] = {
    c: "ㅜ", r: "jung", t: 1,
    b: [100, 220, 824, 320],
    m: [
        [[180, 484], [516, 485], [820, 490]],
        [[516, 485], [512, 360], [505, 245]]
    ],
    w: [36, 36]
};

// 5. Jung_T2_ㅜ (stem centered on bar, starts at bar)
wh.parts['Jung_T2_ㅜ'] = {
    c: "ㅜ", r: "jung", t: 2,
    b: [100, 440, 824, 220],
    m: [
        [[180, 621], [509, 622], [820, 625]],
        [[515, 620], [512, 540], [508, 460]]
    ],
    w: [36, 36]
};

// 6. Jung_T2_ㅗ (vertical stem meets bar cleanly)
wh.parts['Jung_T2_ㅗ'] = {
    c: "ㅗ", r: "jung", t: 2,
    b: [100, 440, 824, 220],
    m: [
        [[485, 645], [490, 580], [495, 505]],
        [[260, 500], [500, 505], [750, 500]]
    ],
    w: [36, 36]
};

const newContent = `/* 자동 생성: tools/build_centerlines.js — 직접 수정하지 마세요. */\nwindow.HANGUL_WH_CENTERLINES = ${JSON.stringify(wh)};\n`;
fs.writeFileSync('c:/project/한글획순/warehouse_centerlines.js', newContent);
console.log('Successfully applied all centerline refinements to warehouse_centerlines.js');

// Also update C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json
const rawWarehousePath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
if (fs.existsSync(rawWarehousePath)) {
    const raw = JSON.parse(fs.readFileSync(rawWarehousePath, 'utf8'));
    ['Jung_T2_ㅚ', 'Jung_T2_ㅘ', 'Jung_T2_ㅙ', 'Jung_T1_ㅜ', 'Jung_T2_ㅜ', 'Jung_T2_ㅗ'].forEach(id => {
        if (raw.parts[id]) {
            raw.parts[id].medians = wh.parts[id].m;
            raw.parts[id].box = { x: wh.parts[id].b[0], y: wh.parts[id].b[1], w: wh.parts[id].b[2], h: wh.parts[id].b[3] };
        }
    });
    fs.writeFileSync(rawWarehousePath, JSON.stringify(raw, null, 2));
    console.log('Successfully updated hangul_150_parts_warehouse.json');
}
