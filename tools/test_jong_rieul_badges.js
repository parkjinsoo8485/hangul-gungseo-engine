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

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'warehouse_centerlines.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'warehouse_bridge.js'), 'utf8'), sandbox);
vm.runInContext(jsCode, sandbox);

const Engine = vm.runInContext('Engine', sandbox);

console.log('--- 낱자-음절 통합 파이프라인 검증 (Single Jamos) ---');
['ㄱ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅎ', 'ㅏ', 'ㅗ', 'ㅙ', 'ㄳ'].forEach(ch => {
    Engine.loadText(ch);
    const strokes = Engine.strokes;
    const meta = Engine.strokeMeta;
    console.log(`단독 낱자 [${ch}]: 총 ${strokes.length}획, whId: ${meta[0] ? meta[0].whId : 'none'}`);
    meta.forEach((m, i) => {
        const st = strokes[i];
        const startPt = `[${st[0][0].toFixed(1)}, ${st[0][1].toFixed(1)}]`;
        const endPt = `[${st[st.length-1][0].toFixed(1)}, ${st[st.length-1][1].toFixed(1)}]`;
        console.log(`  획 ${i + 1}: ${startPt} -> ${endPt}`);
    });
});
