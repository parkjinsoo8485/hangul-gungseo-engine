const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const vm = require('vm');

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
    console: console, Math: Math, Array: Array, Object: Object, String: String, Number: Number, Float32Array: Float32Array, requestAnimationFrame: function() {}
};
sandbox.window = sandbox;

const whCode = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const bridgeCode = fs.readFileSync('warehouse_bridge.js', 'utf8');

vm.createContext(sandbox);
vm.runInContext(whCode, sandbox);
vm.runInContext(bridgeCode, sandbox);
vm.runInContext(jsCode, sandbox);

const Engine = vm.runInContext('Engine', sandbox);

// === 전체 한글 음절 획순 하네스 ===
// 대표 음절 100개 이상 테스트

const CHOS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNGS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONGS = ['','ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const STROKE_COUNTS = {
    cho: {'ㄱ':1,'ㄲ':2,'ㄴ':1,'ㄷ':2,'ㄸ':4,'ㄹ':3,'ㅁ':3,'ㅂ':4,'ㅃ':8,'ㅅ':2,'ㅆ':4,'ㅇ':1,'ㅈ':3,'ㅉ':6,'ㅊ':4,'ㅋ':2,'ㅌ':3,'ㅍ':4,'ㅎ':3},
    jung: {'ㅏ':2,'ㅐ':3,'ㅑ':3,'ㅒ':4,'ㅓ':2,'ㅔ':3,'ㅕ':3,'ㅖ':4,'ㅗ':2,'ㅘ':4,'ㅙ':5,'ㅚ':3,'ㅛ':3,'ㅜ':2,'ㅝ':4,'ㅞ':5,'ㅟ':3,'ㅠ':3,'ㅡ':1,'ㅢ':2,'ㅣ':1},
    jong: {'':0,'ㄱ':1,'ㄴ':1,'ㄷ':2,'ㄹ':3,'ㅁ':3,'ㅂ':4,'ㅅ':2,'ㅇ':1,'ㅈ':3,'ㅊ':4,'ㅋ':2,'ㅌ':3,'ㅍ':4,'ㅎ':3}
};

const issues = [];
let tested = 0;

// Test representative syllables
function makeSyllable(choIdx, jungIdx, jongIdx) {
    const c = 0xAC00 + choIdx * 588 + jungIdx * 28 + jongIdx;
    return String.fromCharCode(c);
}

const JONG_INDICES = {
    '': 0, 'ㄱ': 1, 'ㄴ': 4, 'ㄷ': 7, 'ㄹ': 8, 'ㅁ': 16, 'ㅂ': 17, 'ㅅ': 19, 
    'ㅇ': 21, 'ㅈ': 22, 'ㅊ': 23, 'ㅋ': 24, 'ㅌ': 25, 'ㅍ': 26, 'ㅎ': 27
};

let totalOk = 0;
let totalFail = 0;

CHOS.forEach((cho, ci) => {
    JUNGS.forEach((jung, ji) => {
        // Test with no-jong, and a few common jong
        ['', 'ㄱ', 'ㄴ', 'ㄹ', 'ㅁ', 'ㅇ', 'ㅎ'].forEach(jong => {
            const jongI = JONG_INDICES[jong];
            if (jongI === undefined) return;
            
            const ch = makeSyllable(ci, ji, jongI);
            
            try {
                Engine.loadText(ch);
                const numStrokes = Engine.strokes.length;
                tested++;
                
                const expectedCho = STROKE_COUNTS.cho[cho] || 1;
                const expectedJung = STROKE_COUNTS.jung[jung] || 1;
                const expectedJong = STROKE_COUNTS.jong[jong] || 0;
                const expected = expectedCho + expectedJung + expectedJong;
                
                // Loose check: stroke count should be within 2 of expected
                if (numStrokes < expected - 2 || numStrokes > expected + 2) {
                    issues.push(`'${ch}' (${cho}+${jung}+${jong}): 획수 ${numStrokes} (기대: ${expected})`);
                    totalFail++;
                } else {
                    totalOk++;
                }
                
                // Check for NaN or extreme values in stroke coordinates
                for (let s = 0; s < Engine.strokes.length; s++) {
                    const pts = Engine.strokes[s];
                    for (const [x, y] of pts) {
                        if (isNaN(x) || isNaN(y) || x < -20 || x > 220 || y < -20 || y > 120) {
                            issues.push(`'${ch}' stroke ${s}: 좌표 이상 (${x.toFixed(1)}, ${y.toFixed(1)})`);
                            break;
                        }
                    }
                }
            } catch (e) {
                issues.push(`'${ch}': 로드 오류 - ${e.message}`);
                totalFail++;
            }
        });
    });
});

console.log(`\n=== 전체 음절 하네스 검사 결과 ===`);
console.log(`테스트: ${tested}개 음절`);
console.log(`정상: ${totalOk}개`);
console.log(`이상: ${totalFail}개`);
console.log(`발견된 문제: ${issues.length}개`);
issues.slice(0, 30).forEach(iss => console.log(' - ' + iss));
if (issues.length > 30) {
    console.log(`  ... (${issues.length - 30}개 더 있음)`);
}
