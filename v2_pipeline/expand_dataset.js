const fs = require('fs');
const fontkit = require('./node_modules/fontkit');

const collection = fontkit.openSync('C:/Windows/Fonts/batang.ttc');
const gungsuh = collection.fonts[2];

function getSVG(ch) {
    return gungsuh.glyphForCodePoint(ch.charCodeAt(0)).path.toSVG();
}

const dataset = JSON.parse(fs.readFileSync('C:/한글획순/v2_pipeline/hangul_stroke_dataset.json', 'utf8'));

// Common vowel 'ㅏ' for all these syllables
const vowel_a_strokes = [
    {
        name: "중성_ㅏ_세로기둥",
        path: "M 715 820 L 715 370 L 725 -80",
        samplePoints: [
            [715, 820], [715, 620], [715, 420], [718, 220], [722, 20], [725, -80]
        ],
        clipWidth: 120,
        clipBox: { x: 670, y: -150, w: 180, h: 1050 }
    },
    {
        name: "중성_ㅏ_곁줄기",
        path: "M 715 370 L 965 370",
        samplePoints: [
            [715, 370], [780, 370], [850, 370], [920, 370], [965, 370]
        ],
        clipWidth: 110,
        clipBox: { x: 705, y: 300, w: 320, h: 150 }
    }
];

// --- 1. '마' (5 strokes) ---
dataset['마'] = {
    char: '마',
    outline: getSVG('마'),
    strokes: [
        {
            strokeId: 0,
            name: "초성_ㅁ_1획(좌세로)",
            path: "M 195 580 L 190 235",
            samplePoints: [[195, 580], [193, 460], [192, 340], [190, 235]],
            clipWidth: 105,
            clipBox: { x: 90, y: 170, w: 175, h: 460 }
        },
        {
            strokeId: 1,
            name: "초성_ㅁ_2획(상우꺾임)",
            path: "M 190 575 L 465 565 Q 480 400 460 235",
            samplePoints: [
                [190, 575], [280, 572], [370, 568], [465, 565],
                [475, 450], [468, 340], [460, 235]
            ],
            clipWidth: 110,
            clipBox: { x: 180, y: 220, w: 375, h: 420 }
        },
        {
            strokeId: 2,
            name: "초성_ㅁ_3획(하단가로)",
            path: "M 170 240 L 485 240",
            samplePoints: [[170, 240], [250, 240], [330, 240], [410, 240], [485, 240]],
            clipWidth: 100,
            clipBox: { x: 120, y: 170, w: 410, h: 120 }
        },
        {
            strokeId: 3,
            ...vowel_a_strokes[0]
        },
        {
            strokeId: 4,
            ...vowel_a_strokes[1]
        }
    ]
};

// --- 2. '바' (6 strokes) ---
dataset['바'] = {
    char: '바',
    outline: getSVG('바'),
    strokes: [
        {
            strokeId: 0,
            name: "초성_ㅂ_1획(좌세로)",
            path: "M 205 675 L 195 240",
            samplePoints: [[205, 675], [202, 530], [200, 380], [195, 240]],
            clipWidth: 105,
            clipBox: { x: 90, y: 170, w: 170, h: 540 }
        },
        {
            strokeId: 1,
            name: "초성_ㅂ_2획(우세로)",
            path: "M 445 675 L 450 240",
            samplePoints: [[445, 675], [447, 530], [448, 380], [450, 240]],
            clipWidth: 105,
            clipBox: { x: 370, y: 170, w: 180, h: 540 }
        },
        {
            strokeId: 2,
            name: "초성_ㅂ_3획(중간가로)",
            path: "M 180 435 L 460 435",
            samplePoints: [[180, 435], [250, 435], [320, 435], [390, 435], [460, 435]],
            clipWidth: 95,
            clipBox: { x: 180, y: 360, w: 290, h: 130 }
        },
        {
            strokeId: 3,
            name: "초성_ㅂ_4획(하단가로)",
            path: "M 170 240 L 475 240",
            samplePoints: [[170, 240], [250, 240], [330, 240], [410, 240], [475, 240]],
            clipWidth: 95,
            clipBox: { x: 160, y: 170, w: 340, h: 120 }
        },
        {
            strokeId: 4,
            ...vowel_a_strokes[0]
        },
        {
            strokeId: 5,
            ...vowel_a_strokes[1]
        }
    ]
};

// --- 3. '사' (4 strokes) ---
dataset['사'] = {
    char: '사',
    outline: getSVG('사'),
    strokes: [
        {
            strokeId: 0,
            name: "초성_ㅅ_1획(좌하삐침)",
            path: "M 365 640 Q 250 450 85 270",
            samplePoints: [
                [365, 640], [310, 540], [250, 450], [180, 360], [85, 270]
            ],
            clipWidth: 120,
            clipBox: { x: 30, y: 220, w: 420, h: 480 }
        },
        {
            strokeId: 1,
            name: "초성_ㅅ_2획(우하빗침)",
            path: "M 320 470 L 515 285",
            samplePoints: [
                [320, 470], [380, 410], [440, 350], [515, 285]
            ],
            clipWidth: 115,
            clipBox: { x: 300, y: 220, w: 260, h: 300 }
        },
        {
            strokeId: 2,
            ...vowel_a_strokes[0]
        },
        {
            strokeId: 3,
            ...vowel_a_strokes[1]
        }
    ]
};

// --- 4. '아' (3 strokes) ---
// 초성 ㅇ: 12시 시작 반시계 방향 타원 링 (CX: 310, CY: 445, RX: 135, RY: 145)
const oPoints = [];
const cx = 310, cy = 445, rx = 135, ry = 145;
for (let angle = 90; angle >= -270; angle -= 30) {
    const rad = angle * Math.PI / 180;
    oPoints.push([
        Math.round(cx + rx * Math.cos(rad)),
        Math.round(cy + ry * Math.sin(rad))
    ]);
}
dataset['아'] = {
    char: '아',
    outline: getSVG('아'),
    strokes: [
        {
            strokeId: 0,
            name: "초성_ㅇ_1획(반시계원)",
            path: oPoints.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ') + ' Z',
            samplePoints: oPoints,
            clipWidth: 120,
            clipBox: { x: 90, y: 240, w: 440, h: 420 }
        },
        {
            strokeId: 1,
            ...vowel_a_strokes[0]
        },
        {
            strokeId: 2,
            ...vowel_a_strokes[1]
        }
    ]
};

// Add directionVectors
for (const k of ['마', '바', '사', '아']) {
    dataset[k].strokes.forEach(st => {
        const pts = st.samplePoints;
        const vecs = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const dx = pts[i+1][0] - pts[i][0];
            const dy = pts[i+1][1] - pts[i][1];
            const len = Math.hypot(dx, dy) || 1;
            vecs.push([+(dx/len).toFixed(3), +(dy/len).toFixed(3)]);
        }
        st.directionVectors = vecs;
    });
}

fs.writeFileSync('C:/한글획순/v2_pipeline/hangul_stroke_dataset.json', JSON.stringify(dataset, null, 2), 'utf8');
fs.writeFileSync('C:/한글획순/v2_pipeline/hangul_stroke_dataset.js', 'window.HANGUL_STROKE_DATASET = ' + JSON.stringify(dataset, null, 2) + ';', 'utf8');
console.log('Successfully expanded dataset with [마, 바, 사, 아]!');
