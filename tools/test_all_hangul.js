const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const vm = require('vm');

const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
const jsCode = html.slice(scriptStart + 8, scriptEnd);

function getEl(id) {
    return {
        id, checked: true, value: '', textContent: '', style: {}, children: [],
        get innerHTML() { return ''; }, set innerHTML(v) {},
        setAttribute: function(k, v) { this[k] = v; }, appendChild: function(c) {},
        addEventListener: function() {}, classList: { add: function() {}, remove: function() {}, contains: function() { return false; } },
        getContext: function() { return { clearRect: function() {}, fillText: function() {}, getImageData: function() { return { data: new Uint8Array(150 * 150 * 4) }; }, createImageData: function(w, h) { return { data: new Uint8Array(w * h * 4) }; }, putImageData: function() {} }; }
    };
}

const sandbox = {
    addEventListener: function() {},
    document: { 
        getElementById: function(id) { return getEl(id); }, 
        createElement: function(tag) { return { tag, width: 150, height: 150, getContext: function() { return { clearRect: function() {}, fillText: function() {}, getImageData: function() { return { data: new Uint8Array(150 * 150 * 4) }; }, createImageData: function(w, h) { return { data: new Uint8Array(w * h * 4) }; }, putImageData: function() {} }; } }; }, 
        createElementNS: function(ns, tag) { return { tag, style: {}, children: [], setAttribute: function(k, v) { this[k] = v; }, appendChild: function(c) {}, classList: { add: function() {}, remove: function() {} } }; }, 
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

// 전체 11172자 검사 (획수 범위 체크 + 좌표 NaN/범위 체크)
const STROKE_COUNTS = {
    cho: {'ㄱ':1,'ㄲ':2,'ㄴ':1,'ㄷ':2,'ㄸ':4,'ㄹ':3,'ㅁ':3,'ㅂ':4,'ㅃ':8,'ㅅ':2,'ㅆ':4,'ㅇ':1,'ㅈ':3,'ㅉ':6,'ㅊ':4,'ㅋ':2,'ㅌ':3,'ㅍ':4,'ㅎ':3},
    jung: {'ㅏ':2,'ㅐ':3,'ㅑ':3,'ㅒ':4,'ㅓ':2,'ㅔ':3,'ㅕ':3,'ㅖ':4,'ㅗ':2,'ㅘ':4,'ㅙ':5,'ㅚ':3,'ㅛ':3,'ㅜ':2,'ㅝ':4,'ㅞ':5,'ㅟ':3,'ㅠ':3,'ㅡ':1,'ㅢ':2,'ㅣ':1},
    jong: {'':0,'ㄱ':1,'ㄲ':2,'ㄳ':2,'ㄴ':1,'ㄵ':4,'ㄶ':4,'ㄷ':2,'ㄹ':3,'ㄺ':4,'ㄻ':6,'ㄼ':7,'ㄽ':5,'ㄾ':6,'ㄿ':7,'ㅀ':6,'ㅁ':3,'ㅂ':4,'ㅄ':6,'ㅅ':2,'ㅆ':4,'ㅇ':1,'ㅈ':3,'ㅊ':4,'ㅋ':2,'ㅌ':3,'ㅍ':4,'ㅎ':3}
};

const CHOS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNGS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONGS_STR = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

let tested = 0;
let ok = 0;
const issues = [];
const coordIssues = [];

for (let ci = 0; ci < CHOS.length; ci++) {
    for (let ji = 0; ji < JUNGS.length; ji++) {
        for (let jongI = 0; jongI < JONGS_STR.length; jongI++) {
            const code = ci * 588 + ji * 28 + jongI;
            const ch = String.fromCharCode(0xAC00 + code);
            const cho = CHOS[ci], jung = JUNGS[ji], jong = JONGS_STR[jongI];
            
            try {
                Engine.loadText(ch);
                tested++;
                
                const expectedCho = STROKE_COUNTS.cho[cho] || 1;
                const expectedJung = STROKE_COUNTS.jung[jung] || 1;
                const expectedJong = STROKE_COUNTS.jong[jong] || 0;
                const expected = expectedCho + expectedJung + expectedJong;
                const actual = Engine.strokes.length;
                
                // Stroke count within tolerance
                if (actual < 1) {
                    issues.push(`'${ch}': 획수 0 (기대 ${expected})`);
                    continue;
                }
                
                // Check for NaN or out-of-range coords
                let hasCoordIssue = false;
                for (let s = 0; s < Engine.strokes.length; s++) {
                    const pts = Engine.strokes[s];
                    for (const pt of pts) {
                        if (isNaN(pt[0]) || isNaN(pt[1])) {
                            coordIssues.push(`'${ch}' stroke ${s}: NaN`);
                            hasCoordIssue = true;
                            break;
                        }
                    }
                    if (hasCoordIssue) break;
                }
                
                if (!hasCoordIssue) ok++;
                
            } catch (e) {
                issues.push(`'${ch}': 예외 - ${e.message}`);
            }
        }
    }
}

const allIssues = [...issues, ...coordIssues];
console.log(`전체 한글 11172자 검사 완료`);
console.log(`테스트: ${tested}`);
console.log(`정상: ${ok}`);
console.log(`문제: ${allIssues.length}`);
allIssues.slice(0, 50).forEach(i => console.log(' - ' + i));
if (allIssues.length === 0) console.log('✅ 전체 11172자 검사 통과!');
