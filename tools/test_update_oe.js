const fs = require('fs');

// Read warehouse_centerlines.js
let content = fs.readFileSync('c:/project/한글획순/warehouse_centerlines.js', 'utf8');
const dataStr = content.replace(/^\/\*.*?\*\/\s*window\.HANGUL_WH_CENTERLINES\s*=\s*/s, '').replace(/;\s*$/, '');
const wh = JSON.parse(dataStr);

// Original Jung_T2_ㅚ:
// {"c":"ㅚ","r":"jung","t":2,"b":[160,380,780,540],"m":[[[487,717],[530,627]],[[369,593],[519,668],[674,603]],[[689,879],[728,650],[715,407]]],"w":[31,31,32]}

// New Jung_T2_ㅚ:
// Stroke 0 (ㅗ vertical stem): connects from y=550 down to horizontal bar at y=460, x=480..490
// Stroke 1 (ㅗ horizontal bar): spans x=180..720 at y=450..460
// Stroke 2 (ㅣ vertical stem): x=690..720, y=410..880

const new_Jung_T2_oe = {
    c: "ㅚ",
    r: "jung",
    t: 2,
    b: [160, 380, 780, 540],
    m: [
        [[480, 550], [490, 460]],
        [[180, 445], [450, 460], [710, 445]],
        [[689, 879], [728, 650], [715, 407]]
    ],
    w: [31, 31, 32]
};

wh.parts['Jung_T2_ㅚ'] = new_Jung_T2_oe;

// Also update Jung_T2_u (ㅜ) stem center:
// Original Jung_T2_ㅜ:
// {"c":"ㅜ","r":"jung","t":2,"b":[100,440,824,220],"m":[[[180,621],[509,622],[820,625]],[[580,620],[576,547],[569,460]]],"w":[36,36]}
// Note: bar is at y=622, stem starts at x=580, ends at x=569.
// Bar spans x=180..820 (mid=500). In 순 font glyph, stem center is at x=64.5% of cell -> HanziWriter x = 64.5 * 10.24 = 660 or so?
// Wait, let's check what stem coordinates match 순 glyph perfectly!

const newContent = `/* 자동 생성: tools/build_centerlines.js — 직접 수정하지 마세요. */\nwindow.HANGUL_WH_CENTERLINES = ${JSON.stringify(wh)};\n`;
fs.writeFileSync('c:/project/한글획순/warehouse_centerlines.js', newContent);
console.log('Updated warehouse_centerlines.js with candidate Jung_T2_ㅚ');
