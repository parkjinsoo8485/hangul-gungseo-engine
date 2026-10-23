const fs = require('fs');

global.window = global;
eval(fs.readFileSync('c:/project/한글획순/warehouse_centerlines.js', 'utf8'));
const wh = HANGUL_WH_CENTERLINES;

// 1. Cho_T3_ㅈ
wh.parts['Cho_T3_ㅈ'] = {
    c: "ㅈ", r: "cho", t: 3,
    b: [100, 520, 430, 370],
    m: [
        [[188, 810], [347, 818], [497, 813]],
        [[347, 815], [330, 720], [280, 640], [165, 568]],
        [[350, 740], [430, 650], [511, 575]]
    ],
    w: [32, 32, 32]
};

// 2. Cho_T3_ㅊ
wh.parts['Cho_T3_ㅊ'] = {
    c: "ㅊ", r: "cho", t: 3,
    b: [100, 520, 430, 370],
    m: [
        [[291, 830], [346, 831], [413, 837]],
        [[191, 762], [340, 760], [496, 766]],
        [[340, 758], [320, 680], [250, 610], [148, 551]],
        [[345, 690], [420, 630], [506, 575]]
    ],
    w: [32, 32, 28, 28]
};

const newContent = `/* 자동 생성: tools/build_centerlines.js — 직접 수정하지 마세요. */\nwindow.HANGUL_WH_CENTERLINES = ${JSON.stringify(wh)};\n`;
fs.writeFileSync('c:/project/한글획순/warehouse_centerlines.js', newContent);

// Also sync to hangul_150_parts_warehouse.json
const rawWarehousePath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
if (fs.existsSync(rawWarehousePath)) {
    const raw = JSON.parse(fs.readFileSync(rawWarehousePath, 'utf8'));
    ['Cho_T3_ㅈ', 'Cho_T3_ㅊ'].forEach(id => {
        if (raw.parts[id]) raw.parts[id].medians = wh.parts[id].m;
    });
    fs.writeFileSync(rawWarehousePath, JSON.stringify(raw, null, 2));
}

console.log('Fixed Cho_T3_ㅈ and Cho_T3_ㅊ diagonal connections to top bar!');
