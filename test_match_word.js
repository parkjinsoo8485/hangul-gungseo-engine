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

const words = ['꽃닭', '밟죨', '뼤셼', '썰뿬', '물궁', '국어', '한글', '획순', '정음', '훈민', '서체', '궁서', '대한', '민국'];

// Also load list from file
const allWords = fs.readFileSync('all_words.txt', 'utf8').split(/\s+/).filter(w => w.length === 2);

console.log('Testing', allWords.length, 'words...');
for (const w of allWords) {
    try {
        Engine.loadText(w);
        if (Engine.charCount === 2) {
            // Check if char 0 has 5 strokes (strokes 0..4) and char 1 has 9 strokes (strokes 5..13)
            const c0 = Engine.strokeMeta.filter(m => m.ci === 0).length;
            const c1 = Engine.strokeMeta.filter(m => m.ci === 1).length;
            if (c0 === 5 && c1 === 9) {
                console.log(`MATCH! Word: "${w}" (c0=${c0}, c1=${c1})`);
            }
        }
    } catch (e) {}
}
