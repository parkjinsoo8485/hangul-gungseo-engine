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
            id,
            checked: true,
            value: '',
            textContent: '',
            style: {},
            children: [],
            get innerHTML() { return ''; },
            set innerHTML(v) { this.children = []; },
            setAttribute: function(k, v) { this[k] = v; },
            appendChild: function(c) { this.children.push(c); },
            addEventListener: function() {},
            classList: { add: function() {}, remove: function() {}, contains: function() { return false; } },
            getContext: function() {
                return {
                    clearRect: function() {},
                    fillText: function() {},
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
                tag: tag,
                width: 150,
                height: 150,
                getContext: function() {
                    return {
                        clearRect: function() {},
                        fillText: function() {},
                        getImageData: function() { return { data: new Uint8Array(150 * 150 * 4) }; },
                        createImageData: function(w, h) { return { data: new Uint8Array(w * h * 4) }; },
                        putImageData: function() {}
                    };
                }
            };
        },
        createElementNS: function(ns, tag) {
            return {
                tag: tag,
                style: {},
                children: [],
                setAttribute: function(k, v) { this[k] = v; },
                appendChild: function(c) { this.children.push(c); },
                classList: { add: function() {}, remove: function() {} }
            };
        },
        querySelectorAll: function() { return []; }
    },
    console: console,
    Math: Math,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Float32Array: Float32Array,
    requestAnimationFrame: function() {}
};
sandbox.window = sandbox;

// Load warehouse centerlines and bridge
const whCode = fs.readFileSync('warehouse_centerlines.js', 'utf8');
const bridgeCode = fs.readFileSync('warehouse_bridge.js', 'utf8');

vm.createContext(sandbox);
vm.runInContext(whCode, sandbox);
vm.runInContext(bridgeCode, sandbox);
vm.runInContext(jsCode, sandbox);

const Engine = vm.runInContext('Engine', sandbox);

// Let's test candidates
const candidates = ['대한', '무궁화', '통합', '방향', '태평', '대한민국', '한글'];
for (const cand of candidates) {
    Engine.loadText(cand);
    console.log(`\nWord "${cand}": ${Engine.charCount} chars, ${Engine.strokes.length} strokes`);
    Engine.strokeMeta.forEach((m, idx) => {
        const bp = Engine.badgePositions && Engine.badgePositions[idx];
        const bpStr = bp ? `bx=${bp.bx.toFixed(1)}, by=${bp.by.toFixed(1)}` : 'no-badge';
        console.log(`  Stroke ${idx + 1} (Char ${m.ci} ${cand[m.ci]} - ${m.part}): ${bpStr}`);
    });
}
