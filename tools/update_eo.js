const fs = require('fs');

global.window = global;
eval(fs.readFileSync('c:/project/한글획순/warehouse_centerlines.js', 'utf8'));
const wh = HANGUL_WH_CENTERLINES;

// Update Jung_T2_ㅓ:
// Stroke 0 (horizontal bar): connects from x=630..810 at hy=740..755
// Stroke 1 (vertical stem): stays x=776..817, y=433..899
wh.parts['Jung_T2_ㅓ'] = {
    c: "ㅓ", r: "jung", t: 2,
    b: [550, 380, 390, 540],
    m: [
        [[630, 755], [720, 750], [810, 740]],
        [[776, 899], [817, 650], [814, 433]]
    ],
    w: [20, 20]
};

const newContent = `/* 자동 생성: tools/build_centerlines.js — 직접 수정하지 마세요. */\nwindow.HANGUL_WH_CENTERLINES = ${JSON.stringify(wh)};\n`;
fs.writeFileSync('c:/project/한글획순/warehouse_centerlines.js', newContent);

// Also sync to hangul_150_parts_warehouse.json
const rawWarehousePath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
if (fs.existsSync(rawWarehousePath)) {
    const raw = JSON.parse(fs.readFileSync(rawWarehousePath, 'utf8'));
    if (raw.parts['Jung_T2_ㅓ']) {
        raw.parts['Jung_T2_ㅓ'].medians = wh.parts['Jung_T2_ㅓ'].m;
    }
    fs.writeFileSync(rawWarehousePath, JSON.stringify(raw, null, 2));
}

console.log('Updated Jung_T2_ㅓ horizontal bar height to hy=755..740');
