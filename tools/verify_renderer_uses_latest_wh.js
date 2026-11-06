const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
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

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('warehouse_centerlines.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('warehouse_bridge.js', 'utf8'), sandbox);
vm.runInContext(jsCode, sandbox);
const Engine = vm.runInContext('Engine', sandbox);
const WH = vm.runInContext('WH', sandbox);

Engine.init();

console.log('--- WH Engine Verification ---');
console.log('WH.ready():', WH.ready());
console.log('WH.version:', WH.version);
console.log('Total WH parts loaded:', Object.keys(WH.data.parts).length);

// Test syllable with recent modification: '굶' (Cho: ㄱ, Jung: ㅜ, Jong: ㄻ)
// The user modified Jong_T2_ㄻ!
const salmInfo = WH.env.decomposeHangul('굶');
const entries = WH.buildEntries(salmInfo, 0, 'H', true);
console.log('Entries for "굶":', entries.map(e => e.whId));

const jongEntry = entries.find(e => e.whId.startsWith('Jong_'));
console.log('Jong part id for "굶":', jongEntry ? jongEntry.whId : 'NONE');

// Check if Jong_T2_ㄻ has the latest modified coordinates
const rawJongPart = WH.data.parts['Jong_T2_ㄻ'];
console.log('Jong_T2_ㄻ 4th stroke start point:', rawJongPart.m[3][0]); // should be [513, 306]
console.log('Jong_T2_ㄻ 4th stroke end point:', rawJongPart.m[3][2]);   // should be [570, 93]
console.log('Jong_T2_ㄻ 5th stroke start point:', rawJongPart.m[4][0]); // should be [596, 292] (newly modified!)
console.log('Jong_T2_ㄻ 6th stroke start point:', rawJongPart.m[5][0]); // should be [603, 119] (newly modified!)
