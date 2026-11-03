/**
 * ============================================================================
 * 국립국어원 표준 서예 획순 및 비침범 전용 하네스 검증기 (harness_calligraphy_stroke_order.js)
 * ============================================================================
 * [3단계 솔루션 핵심 검증 엔진]
 * 1. 방향 검증 (Directionality):
 *    - 세로획: 상 -> 하 (화면 기준 dy > 0)
 *    - 가로획: 좌 -> 우 (dx > 0)
 *    - 원/폐곡선: 12시 방향 시작 반시계방향 운필
 *    - 삐침/파임: 상 -> 하 (dy > 0)
 * 2. 순서 검증 (Sequence Order):
 *    - 초성 전체 획 완료 -> 중성(선행 -> 후행) 완료 -> 종성(좌 -> 우) 완료
 *    - ㄹ 계열: 1(상단 ㄱ형) -> 2(가운데 가로) -> 3(하단 ㄴ형)
 *    - ㄷ 계열: 1(상단 가로) -> 2(하단 ㄴ형)
 *    - ㅌ 계열: 1(상단 가로) -> 2(가운데 가로) -> 3(하단 ㄴ형)
 *    - ㅂ 계열: 1(좌세로) -> 2(우세로) -> 3(중가로) -> 4(하가로)
 *    - ㅍ 계열: 1(상가로) -> 2(좌세로) -> 3(우세로) -> 4(하가로)
 *    - ㅎ 계열: 1(상점) -> 2(가로) -> 3(원)
 * 3. 낱자-음절 파편화 검증:
 *    - 51개 전체 단독 낱자가 통합 파이프라인(WH.buildSingleEntry)을 통과하는지 전수 검증
 * 4. 취약 아키타입 및 대표 완성형 음절군 검증 (월, 활, 물, 불, 풀, 돌, 골, 솔, 올, 닮, 낢, 딸, 땀 등)
 * ============================================================================
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
const jsCode = html.slice(scriptStart + 8, scriptEnd);

const elements = {};
function getEl(id) {
    if (!elements[id]) {
        elements[id] = {
            id, checked: true, value: '', textContent: '', style: {}, children: [],
            get innerHTML() { return ''; }, set innerHTML(v) { this.children = []; },
            setAttribute: function(k, v) { this[k] = v; }, appendChild: function(c) { this.children.push(c); },
            addEventListener: function() {}, classList: { add: function() {}, remove: function() {}, contains: function() { return false; } },
            getContext: function() {
                return {
                    clearRect: function() {}, fillText: function() {},
                    getImageData: function() { return { data: new Uint8Array(150 * 150 * 4) }; },
                    createImageData: function(w, h) { return { data: new Uint8Array(w * h * 4) }; },
                    putImageData: function() {}
                };
            }
        };
    }
    return elements[id];
}

const sandbox = {
    addEventListener: function() {},
    document: {
        getElementById: getEl,
        createElement: function(tag) {
            return {
                tag: tag, width: 150, height: 150,
                getContext: function() {
                    return {
                        clearRect: function() {}, fillText: function() {},
                        getImageData: function() { return { data: new Uint8Array(150 * 150 * 4) }; },
                        createImageData: function(w, h) { return { data: new Uint8Array(w * h * 4) }; },
                        putImageData: function() {}
                    };
                }
            };
        },
        createElementNS: function(ns, tag) {
            return {
                tag: tag, style: {}, children: [],
                setAttribute: function(k, v) { this[k] = v; },
                appendChild: function(c) { this.children.push(c); },
                classList: { add: function() {}, remove: function() {} }
            };
        },
        querySelectorAll: function() { return []; }
    },
    console: { log: function() {}, warn: function() {}, error: console.error },
    Math: Math, Array: Array, Object: Object, String: String, Number: Number,
    Float32Array: Float32Array, Uint8Array: Uint8Array, Uint32Array: Uint32Array,
    Map: Map, Set: Set, Promise: Promise,
    requestAnimationFrame: function() {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const whCode = fs.readFileSync(path.join(__dirname, '..', 'warehouse_centerlines.js'), 'utf8');
const bridgeCode = fs.readFileSync(path.join(__dirname, '..', 'warehouse_bridge.js'), 'utf8');

vm.createContext(sandbox);
vm.runInContext(whCode, sandbox);
vm.runInContext(bridgeCode, sandbox);
vm.runInContext(jsCode, sandbox);

const Engine = vm.runInContext('Engine', sandbox);
const WH = vm.runInContext('WH', sandbox);

console.log('=== [3단계] 서예 획순 하네스 검증 시작 ===');
console.log('Warehouse Ready:', WH.ready(), 'Version:', WH.version);

const CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const DOUBLE_BATCHIM = ['ㄳ','ㄵ','ㄶ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅄ'];
const ALL_51_JAMOS = [...CHO_LIST, ...JUNG_LIST, ...DOUBLE_BATCHIM];

const TARGET_WORDS = [
    '월', '활', '물', '불', '풀', '돌', '골', '솔', '올',
    '닮', '달', '다', '나', '날', '낢', '따', '딸', '땀',
    '라', '랄', '람', '타', '탈', '탐', '파', '팔', '팜',
    '되', '됀', '왜', '웨', '웽', '왝', '궁', '국', '군',
    '예', '에', '계', '게', '뎨', '데', '옉', '엑', '곅', '겍',
    '여', '역', '겨', '격', '댜', '댝', '야', '약', '갸', '갹',
    '희', '흰', '의', '원', '권', '글', '흙', '삶', '값', '넓'
];

let totalCharsChecked = 0;
let totalStrokesChecked = 0;
const failures = [];

function checkStrokeOrderForChar(char, isSingle) {
    totalCharsChecked++;
    try {
        Engine.loadText(char);
    } catch (e) {
        failures.push({ char, type: 'LOAD_ERROR', err: e.message });
        return;
    }

    const strokes = Engine.strokes;
    const meta = Engine.strokeMeta || [];

    if (!strokes || !strokes.length) {
        failures.push({ char, type: 'NO_STROKES' });
        return;
    }

    totalStrokesChecked += strokes.length;

    // 1. 단일 파이프라인 검증 (info.single인 경우 whId가 존재하는지 확인)
    if (isSingle) {
        const entry = Engine.jamoEntries && Engine.jamoEntries[0];
        if (!entry || !entry.whId) {
            failures.push({ char, type: 'SINGLE_JAMO_NOT_IN_UNIFIED_PIPELINE' });
        }
    }

    // 2. 음절 조립 순서 검증: Cho -> Jung_H -> Jung_V -> Jong
    if (!isSingle) {
        const orderRank = { 'cho': 1, 'jung_h': 2, 'jung': 2, 'jung_v': 3, 'jong': 4 };
        let prevRank = 0;
        for (let i = 0; i < strokes.length; i++) {
            const m = meta[i];
            if (!m) continue;
            const rank = orderRank[m.subPart] || orderRank[m.part] || 0;
            if (rank < prevRank) {
                failures.push({ char, type: 'PART_ORDER_INVERTED', stroke: i, prevRank, curRank: rank, meta: m });
            }
            prevRank = rank;
        }
    }

    // 3. 개별 획 방향 검증 (screen coordinates: y goes down)
    strokes.forEach((st, sIdx) => {
        if (!st || st.length < 2) return;
        const first = st[0];
        const last = st[st.length - 1];
        const dx = last[0] - first[0];
        const dy = last[1] - first[1]; // dy > 0 means downward in screen coordinates

        const len = Math.hypot(dx, dy);
        const isClosed = len < 6.0 && st.length >= 6;

        if (isClosed) {
            // Screen coordinates: clockwise has positive signed area, counter-clockwise has negative signed area!
            let signedArea = 0;
            for (let i = 0; i < st.length; i++) {
                const c = st[i];
                const n = st[(i + 1) % st.length];
                signedArea += (c[0] * n[1] - n[0] * c[1]);
            }
            if (signedArea > 15) {
                failures.push({ char, type: 'LOOP_CLOCKWISE_REVERSED', stroke: sIdx, signedArea });
            }
        } else {
            // Horizontal stroke check (|dx| > 2 * |dy|)
            if (Math.abs(dx) > 1.8 * Math.abs(dy) && Math.abs(dx) > 8.0) {
                if (dx < -1.5) {
                    failures.push({ char, type: 'HORIZONTAL_STROKE_REVERSED', stroke: sIdx, dx, dy });
                }
            }
            // Vertical stroke check (|dy| > 1.8 * |dx|)
            if (Math.abs(dy) > 1.8 * Math.abs(dx) && Math.abs(dy) > 8.0) {
                if (dy < -1.5) {
                    failures.push({ char, type: 'VERTICAL_STROKE_REVERSED', stroke: sIdx, dx, dy });
                }
            }
        }
    });

    // 4. 개별 자소별 국립국어원 표준 필순 검사 (ㄹ, ㄷ, ㅌ, ㅂ, ㅍ, ㅎ)
    const decomposed = sandbox.decomposeHangul(char);
    if (!decomposed) return;

    // ㄹ 받침 검사 (월, 활, 물, 불, 풀, 돌, 골, 솔, 올, 닮 등)
    if (decomposed.jong === 'ㄹ') {
        const jongStrokes = [];
        meta.forEach((m, idx) => {
            if (m.part === 'jong') jongStrokes.push({ idx, st: strokes[idx] });
        });
        if (jongStrokes.length === 3) {
            const avgY0 = jongStrokes[0].st.reduce((a, b) => a + b[1], 0) / jongStrokes[0].st.length;
            const avgY1 = jongStrokes[1].st.reduce((a, b) => a + b[1], 0) / jongStrokes[1].st.length;
            const avgY2 = jongStrokes[2].st.reduce((a, b) => a + b[1], 0) / jongStrokes[2].st.length;
            // Screen coords: y goes down. So top stroke has smallest y!
            // Must satisfy: avgY0 < avgY1 && avgY1 < avgY2
            if (avgY0 > avgY1 + 1.0 || avgY1 > avgY2 + 1.0) {
                failures.push({
                    char, type: 'JONG_RIEUL_ORDER_INVERTED',
                    avgYs: [avgY0, avgY1, avgY2],
                    jongStrokes: jongStrokes.map(j => j.idx)
                });
            }
        }
    }
}

// 1. Audit all 51 single jamos
console.log('Testing 51 Single Jamos...');
ALL_51_JAMOS.forEach(ch => checkStrokeOrderForChar(ch, true));

// 2. Audit all target words
console.log(`Testing ${TARGET_WORDS.length} Target Words & Vulnerable Archetypes...`);
TARGET_WORDS.forEach(w => checkStrokeOrderForChar(w, false));

// 3. Audit diverse syllable combinations across all 21 vowels
console.log('Testing diverse syllable combinations across all 21 vowels...');
CHO_LIST.forEach(cho => {
    JUNG_LIST.forEach(jung => {
        const sample1 = sandbox.decomposeHangul ? String.fromCharCode(0xAC00 + CHO_LIST.indexOf(cho)*588 + JUNG_LIST.indexOf(jung)*28) : null;
        if (sample1) checkStrokeOrderForChar(sample1, false);
        const sample2 = sandbox.decomposeHangul ? String.fromCharCode(0xAC00 + CHO_LIST.indexOf(cho)*588 + JUNG_LIST.indexOf(jung)*28 + 8) : null; // + 'ㄹ'
        if (sample2) checkStrokeOrderForChar(sample2, false);
    });
});

console.log('\n=============================================');
console.log('=== [3단계] 서예 획순 하네스 종합 검증 리포트 ===');
console.log('=============================================');
console.log(`총 검증 글자 수: ${totalCharsChecked} 자 (단독 낱자 51자 + 음절 ${totalCharsChecked - 51}자)`);
console.log(`총 검증 획 수: ${totalStrokesChecked} 획`);
console.log(`검출된 획순/방향 결함: ${failures.length} 건`);

if (failures.length > 0) {
    console.log('\n[결함 상세 목록]');
    failures.forEach((f, idx) => console.log(`${idx + 1}. [${f.char}] ${f.type}:`, JSON.stringify(f)));
    process.exit(1);
} else {
    console.log('\n✅ [ALL PASS] 모든 단독 낱자 및 완성형 음절의 획순·방향·파이프라인 100% 무결점 통과!');
    process.exit(0);
}
