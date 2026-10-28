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
            getContext: function() { return { clearRect: function() {}, fillText: function() {}, getImageData: function() { return { data: new Uint8Array(150 * 150 * 4) }; }, createImageData: function(w, h) { return { data: new Uint8Array(w * h * 4) }; }, putImageData: function() {} }; }
        };
    }
    return elements[id];
}

const sandbox = {
    addEventListener: function() {},
    document: { getElementById: getEl, createElement: function(tag) { return { tag: tag, width: 150, height: 150, getContext: function() { return { clearRect: function() {}, fillText: function() {}, getImageData: function() { return { data: new Uint8Array(150 * 150 * 4) }; }, createImageData: function(w, h) { return { data: new Uint8Array(w * h * 4) }; }, putImageData: function() {} }; } }; }, createElementNS: function(ns, tag) { return { tag: tag, style: {}, children: [], setAttribute: function(k, v) { this[k] = v; }, appendChild: function(c) { this.children.push(c); }, classList: { add: function() {}, remove: function() {} } }; }, querySelectorAll: function() { return []; } },
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

// 이 테스트는 단모음을 가진 기본 대표 음절 검사
const testSyllables = [
    // 각 초성 + ㅏ
    '가','까','나','다','따','라','마','바','빠','사','싸','아','자','짜','차','카','타','파','하',
    // 각 모음 + ㄱ초성 + ㅇ종성
    '강','깡','낭','당','딱','량','망','방','빵','상','쌍','앙','장','짱','창','캉','탕','팡','항',
    // 각 모음 + ㅇ초성
    '아','애','야','얘','어','에','여','예','오','와','왜','외','요','우','워','웨','위','유','으','의','이',
    // 복잡한 종성
    '닭','흙','삶','읽','닮','밟','넋','값','몫',
    // 복합모음
    '봐','뵙','귀','취','뢰','쉬','쾌','뇌','의','화',
    // 쌍자음
    '까','떠','뻐','써','쩌',
    // 이중종성
    '닭','흙','앉','않','옳','읽',
    // 실제 단어 샘플
    '한','글','궁','서','체','대','한','민','국','꽃','길','아','름','다','운',
    '훈','민','정','음','서','예','봉','서','체',
    '성','공','영','광','최','고','행','복','사','랑'
];

const STROKE_COUNTS = {
    cho: {'ㄱ':1,'ㄲ':2,'ㄴ':1,'ㄷ':2,'ㄸ':4,'ㄹ':3,'ㅁ':3,'ㅂ':4,'ㅃ':8,'ㅅ':2,'ㅆ':4,'ㅇ':1,'ㅈ':3,'ㅉ':6,'ㅊ':4,'ㅋ':2,'ㅌ':3,'ㅍ':4,'ㅎ':3},
    jung: {'ㅏ':2,'ㅐ':3,'ㅑ':3,'ㅒ':4,'ㅓ':2,'ㅔ':3,'ㅕ':3,'ㅖ':4,'ㅗ':2,'ㅘ':4,'ㅙ':5,'ㅚ':3,'ㅛ':3,'ㅜ':2,'ㅝ':4,'ㅞ':5,'ㅟ':3,'ㅠ':3,'ㅡ':1,'ㅢ':2,'ㅣ':1},
    jong: {'':0,'ㄱ':1,'ㄲ':2,'ㄳ':2,'ㄴ':1,'ㄵ':4,'ㄶ':4,'ㄷ':2,'ㄹ':3,'ㄺ':4,'ㄻ':6,'ㄼ':7,'ㄽ':5,'ㄾ':6,'ㄿ':7,'ㅀ':6,'ㅁ':3,'ㅂ':4,'ㅄ':6,'ㅅ':2,'ㅆ':4,'ㅇ':1,'ㅈ':3,'ㅊ':4,'ㅋ':2,'ㅌ':3,'ㅍ':4,'ㅎ':3}
};

const CHOS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNGS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONGS_STR = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const issues = [];
let tested = 0;
let ok = 0;

for (const ch of [...new Set(testSyllables)]) {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) continue;
    
    const ci = Math.floor(code / 588);
    const ji = Math.floor((code % 588) / 28);
    const jongIdx = code % 28;
    
    const cho = CHOS[ci];
    const jung = JUNGS[ji];
    const jong = JONGS_STR[jongIdx];
    
    try {
        Engine.loadText(ch);
        tested++;
        
        const expectedCho = STROKE_COUNTS.cho[cho] || 1;
        const expectedJung = STROKE_COUNTS.jung[jung] || 1;
        const expectedJong = STROKE_COUNTS.jong[jong] || 0;
        const expected = expectedCho + expectedJung + expectedJong;
        const actual = Engine.strokes.length;
        
        let strokeOk = actual >= expected - 2 && actual <= expected + 2;
        
        if (!strokeOk) {
            issues.push(`'${ch}'(${cho}+${jung}+${jong}): 획수 ${actual} (기대 ${expected})`);
        }
        
        // Check for NaN or extreme values
        let coordOk = true;
        for (let s = 0; s < Engine.strokes.length; s++) {
            const pts = Engine.strokes[s];
            for (const pt of pts) {
                if (isNaN(pt[0]) || isNaN(pt[1])) {
                    issues.push(`'${ch}' stroke ${s}: NaN 좌표`);
                    coordOk = false;
                    break;
                }
                if (pt[0] < -20 || pt[0] > 220 || pt[1] < -20 || pt[1] > 120) {
                    issues.push(`'${ch}' stroke ${s}: 범위초과 좌표 (${pt[0].toFixed(1)}, ${pt[1].toFixed(1)})`);
                    coordOk = false;
                    break;
                }
            }
            if (!coordOk) break;
        }
        
        if (strokeOk && coordOk) ok++;
        
    } catch (e) {
        issues.push(`'${ch}': 오류 - ${e.message}`);
    }
}

console.log(`\n=== 대표 음절 하네스 결과 ===`);
console.log(`테스트: ${tested}개`);
console.log(`정상: ${ok}개`);
console.log(`이상: ${issues.length}개`);
issues.forEach(iss => console.log(' - ' + iss));
if (issues.length === 0) console.log('✅ 모든 음절 검사 통과!');
