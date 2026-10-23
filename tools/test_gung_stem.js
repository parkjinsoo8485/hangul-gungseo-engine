const fs = require('fs');

let content = fs.readFileSync('c:/project/한글획순/warehouse_centerlines.js', 'utf8');
const dataStr = content.replace(/^\/\*.*?\*\/\s*window\.HANGUL_WH_CENTERLINES\s*=\s*/s, '').replace(/;\s*$/, '');
const wh = JSON.parse(dataStr);

// Update Jung_T2_ㅜ:
// Stem starts at [675, 620], goes through [665, 540], ends at [655, 450]
wh.parts['Jung_T2_ㅜ'] = {
    c: "ㅜ", r: "jung", t: 2,
    b: [100, 440, 824, 220],
    m: [
        [[180, 621], [509, 622], [820, 625]],
        [[675, 620], [665, 540], [655, 450]]
    ],
    w: [36, 36]
};

// Also Jung_T1_ㅜ (without batchim, e.g. '구', '주', '추', '수', '우'):
// In T1, stem is longer (drops to y~250)
// Let's check T1 stem position
wh.parts['Jung_T1_ㅜ'] = {
    c: "ㅜ", r: "jung", t: 1,
    b: [100, 220, 824, 320],
    m: [
        [[180, 484], [516, 485], [820, 490]],
        [[675, 485], [665, 360], [655, 235]]
    ],
    w: [36, 36]
};

const newContent = `/* 자동 생성: tools/build_centerlines.js — 직접 수정하지 마세요. */\nwindow.HANGUL_WH_CENTERLINES = ${JSON.stringify(wh)};\n`;
fs.writeFileSync('c:/project/한글획순/warehouse_centerlines.js', newContent);

// Also sync to hangul_150_parts_warehouse.json
const rawWarehousePath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
if (fs.existsSync(rawWarehousePath)) {
    const raw = JSON.parse(fs.readFileSync(rawWarehousePath, 'utf8'));
    ['Jung_T1_ㅜ', 'Jung_T2_ㅜ'].forEach(id => {
        if (raw.parts[id]) {
            raw.parts[id].medians = wh.parts[id].m;
        }
    });
    fs.writeFileSync(rawWarehousePath, JSON.stringify(raw, null, 2));
}

console.log('Updated Jung_T1_ㅜ and Jung_T2_ㅜ with true calligraphic stem position (hx=675..655)');
