const fontkit = require('./node_modules/fontkit');
const fs = require('fs');

const collection = fontkit.openSync('C:/Windows/Fonts/batang.ttc');
const gungsuh = collection.fonts[2];

// Extract full SVG outline for a char
function getGlyphData(ch) {
    const glyph = gungsuh.glyphForCodePoint(ch.charCodeAt(0));
    return {
        char: ch,
        bbox: glyph.bbox,
        svgPath: glyph.path.toSVG()
    };
}

// 1. '가'
// 획 0: 초성 ㄱ (150, 566) -> 어깨 (480, 450) -> 꼬리 (65, 178)
// 획 1: 중성 ㅏ 세로기둥 (715, 830) -> (715, -90)
// 획 2: 중성 ㅏ 곁줄기 (715, 370) -> (960, 370)

// Let's create the master dataset for '가', '나', '다', '라'
const dataset = {};

// --- '가' (3 strokes) ---
dataset['가'] = {
    char: '가',
    outline: getGlyphData('가').svgPath,
    strokes: [
        {
            strokeId: 0,
            name: "초성_ㄱ_1획",
            path: "M 135 566 Q 300 574 450 520 Q 485 450 460 360 Q 340 289 170 200 L 65 178",
            samplePoints: [
                [135, 566], [220, 572], [300, 574], [380, 550], [450, 520],
                [482, 450], [460, 360], [380, 310], [280, 250], [170, 200], [65, 178]
            ],
            clipWidth: 140
        },
        {
            strokeId: 1,
            name: "중성_ㅏ_세로기둥",
            path: "M 715 820 L 715 370 L 725 -80",
            samplePoints: [
                [715, 820], [715, 620], [715, 420], [718, 220], [722, 20], [725, -80]
            ],
            clipWidth: 120
        },
        {
            strokeId: 2,
            name: "중성_ㅏ_곁줄기",
            path: "M 715 370 L 965 370",
            samplePoints: [
                [715, 370], [780, 370], [850, 370], [920, 370], [965, 370]
            ],
            clipWidth: 110
        }
    ]
};

// --- '나' (3 strokes) ---
// 초성 ㄴ: (260, 530) -> 아래로 (230, 210) -> 우측 꺾임 모서리 -> 모음 접필 (660, 205)
// 중성 ㅏ: 세로기둥 (715, 820) -> (725, -80)
// 중성 ㅏ: 곁줄기 (715, 370) -> (965, 370)
dataset['나'] = {
    char: '나',
    outline: getGlyphData('나').svgPath,
    strokes: [
        {
            strokeId: 0,
            name: "초성_ㄴ_1획",
            path: "M 270 540 Q 240 370 215 225 Q 230 185 300 188 L 660 205",
            samplePoints: [
                [270, 540], [250, 430], [230, 320], [215, 225],
                [230, 185], [320, 190], [420, 195], [540, 200], [660, 205]
            ],
            clipWidth: 120
        },
        {
            strokeId: 1,
            name: "중성_ㅏ_세로기둥",
            path: "M 715 820 L 715 370 L 725 -80",
            samplePoints: [
                [715, 820], [715, 620], [715, 420], [718, 220], [722, 20], [725, -80]
            ],
            clipWidth: 120
        },
        {
            strokeId: 2,
            name: "중성_ㅏ_곁줄기",
            path: "M 715 370 L 965 370",
            samplePoints: [
                [715, 370], [780, 370], [850, 370], [920, 370], [965, 370]
            ],
            clipWidth: 110
        }
    ]
};

// --- '다' (4 strokes) ---
// 획 0: 초성 ㄷ 1획 (상단 가로) : (160, 560) -> (480, 555)
// 획 1: 초성 ㄷ 2획 (ㄴ형태) : (230, 480) -> (195, 225) -> 모퉁이 -> 모음 접필 (660, 205)
// 획 2: 중성 ㅏ 세로기둥 : (715, 820) -> (725, -80)
// 획 3: 중성 ㅏ 곁줄기 : (715, 370) -> (965, 370)
dataset['다'] = {
    char: '다',
    outline: getGlyphData('다').svgPath,
    strokes: [
        {
            strokeId: 0,
            name: "초성_ㄷ_1획",
            path: "M 150 560 L 485 555",
            samplePoints: [
                [150, 560], [240, 560], [330, 558], [420, 556], [485, 555]
            ],
            clipWidth: 120
        },
        {
            strokeId: 1,
            name: "초성_ㄷ_2획",
            path: "M 235 480 Q 210 350 195 225 Q 210 185 280 188 L 660 205",
            samplePoints: [
                [235, 480], [215, 380], [200, 290], [195, 225],
                [220, 185], [310, 190], [420, 195], [540, 200], [660, 205]
            ],
            clipWidth: 120
        },
        {
            strokeId: 2,
            name: "중성_ㅏ_세로기둥",
            path: "M 715 820 L 715 370 L 725 -80",
            samplePoints: [
                [715, 820], [715, 620], [715, 420], [718, 220], [722, 20], [725, -80]
            ],
            clipWidth: 120
        },
        {
            strokeId: 3,
            name: "중성_ㅏ_곁줄기",
            path: "M 715 370 L 965 370",
            samplePoints: [
                [715, 370], [780, 370], [850, 370], [920, 370], [965, 370]
            ],
            clipWidth: 110
        }
    ]
};

// --- '라' (5 strokes) ---
// 획 0: 초성 ㄹ 1획 (ㄱ형) : (180, 570) -> (450, 560) -> 꺾임 (420, 450)
// 획 1: 초성 ㄹ 2획 (중간 가로) : (180, 440) -> (460, 435)
// 획 2: 초성 ㄹ 3획 (ㄴ형) : (235, 380) -> (200, 225) -> 모서리 -> 접필 (660, 205)
// 획 3: 중성 ㅏ 세로기둥 : (715, 820) -> (725, -80)
// 획 4: 중성 ㅏ 곁줄기 : (715, 370) -> (965, 370)
dataset['라'] = {
    char: '라',
    outline: getGlyphData('라').svgPath,
    strokes: [
        {
            strokeId: 0,
            name: "초성_ㄹ_1획",
            path: "M 180 570 L 440 560 Q 460 510 420 440",
            samplePoints: [
                [180, 570], [270, 568], [360, 564], [440, 560], [455, 510], [420, 440]
            ],
            clipWidth: 110
        },
        {
            strokeId: 1,
            name: "초성_ㄹ_2획",
            path: "M 180 435 L 450 435",
            samplePoints: [
                [180, 435], [250, 435], [320, 435], [390, 435], [450, 435]
            ],
            clipWidth: 100
        },
        {
            strokeId: 2,
            name: "초성_ㄹ_3획",
            path: "M 235 380 Q 210 290 195 220 Q 210 185 280 188 L 660 205",
            samplePoints: [
                [235, 380], [210, 300], [195, 220],
                [220, 185], [320, 190], [440, 195], [550, 200], [660, 205]
            ],
            clipWidth: 115
        },
        {
            strokeId: 3,
            name: "중성_ㅏ_세로기둥",
            path: "M 715 820 L 715 370 L 725 -80",
            samplePoints: [
                [715, 820], [715, 620], [715, 420], [718, 220], [722, 20], [725, -80]
            ],
            clipWidth: 120
        },
        {
            strokeId: 4,
            name: "중성_ㅏ_곁줄기",
            path: "M 715 370 L 965 370",
            samplePoints: [
                [715, 370], [780, 370], [850, 370], [920, 370], [965, 370]
            ],
            clipWidth: 110
        }
    ]
};

// Calculate normalized direction vectors for all strokes
for (const charKey of Object.keys(dataset)) {
    const item = dataset[charKey];
    item.strokes.forEach(st => {
        const pts = st.samplePoints;
        const vecs = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const dx = pts[i+1][0] - pts[i][0];
            const dy = pts[i+1][1] - pts[i][1];
            const len = Math.hypot(dx, dy) || 1;
            vecs.push([+(dx / len).toFixed(3), +(dy / len).toFixed(3)]);
        }
        st.directionVectors = vecs;
    });
}

fs.writeFileSync('C:/한글획순/v2_pipeline/hangul_stroke_dataset.json', JSON.stringify(dataset, null, 2), 'utf8');
console.log('Successfully created hangul_stroke_dataset.json for [가, 나, 다, 라]');
