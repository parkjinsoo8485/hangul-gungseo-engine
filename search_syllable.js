const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
const jsCode = html.slice(scriptStart + 8, scriptEnd);

const vm = require('vm');
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

// Let's search all syllables ch where strokes of ch has length 9:
// And check which ones have:
// stroke 0 (badge 6): y < 40, x < 50
// stroke 1 (badge 7): y between 20 and 50, x < 50
// stroke 2 (badge 8): y between 20 and 50, x between 20 and 50
// stroke 3 (badge 9): y between 35 and 60, x < 50
// stroke 4 (badge 10): y < 20, x > 50
// stroke 5 (badge 11): y between 30 and 60, x > 60
// stroke 6 (badge 12): y between 45 and 65
// stroke 7 (badge 13): y between 55 and 75
// stroke 8 (badge 14): y > 65
const CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG_LIST = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const matches = [];

for (let cho of CHO_LIST) {
    for (let jung of JUNG_LIST) {
        for (let jong of JONG_LIST) {
            const ch = String.fromCharCode(0xAC00 + CHO_LIST.indexOf(cho)*588 + JUNG_LIST.indexOf(jung)*28 + JONG_LIST.indexOf(jong));
            // Test with a 5-stroke prefix so strokes become 6..14!
            Engine.loadText('가' + ch); // '가': ㄱ(1)+ㅏ(2) = 3 strokes, prefix needs 5 strokes
            if (Engine.charCount === 2 && Engine.strokes.length === 14) {
                // Check if char 1 starts at stroke 5 (index 5 => badge 6)
                if (Engine.strokeMeta[5].ci === 1) {
                    matches.push({ ch, cho, jung, jong, strokes: Engine.strokes.length });
                }
            }
        }
    }
}

console.log(`Found ${matches.length} matching syllables where Char 2 has 9 strokes (6..14) with a 5-stroke prefix:`);
matches.slice(0, 30).forEach(m => console.log(`  ${m.ch} (${m.cho} + ${m.jung} + ${m.jong})`));
