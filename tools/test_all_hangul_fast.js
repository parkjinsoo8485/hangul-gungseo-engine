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

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('warehouse_centerlines.js', 'utf8'), sandbox);
vm.runInContext(fs.readFileSync('warehouse_bridge.js', 'utf8'), sandbox);
vm.runInContext(jsCode, sandbox);
const Engine = vm.runInContext('Engine', sandbox);

// 전체 11172자를 빠르게 검사 (NaN 체크 + 획수 최소 1개 이상)
let ok = 0, fail = 0;
const fails = [];

for (let i = 0; i < 11172; i++) {
    const ch = String.fromCharCode(0xAC00 + i);
    try {
        Engine.loadText(ch);
        const n = Engine.strokes.length;
        if (n < 1) {
            fails.push(ch + ':0획');
            fail++;
            continue;
        }
        let hasNaN = false;
        for (const st of Engine.strokes) {
            for (const pt of st) {
                if (isNaN(pt[0]) || isNaN(pt[1])) {
                    hasNaN = true;
                    break;
                }
            }
            if (hasNaN) break;
        }
        if (hasNaN) {
            fails.push(ch + ':NaN');
            fail++;
        } else {
            ok++;
        }
    } catch (e) {
        fails.push(ch + ':' + e.message.slice(0, 30));
        fail++;
    }
    
    if ((i + 1) % 1000 === 0) {
        process.stdout.write(`${i + 1}/11172 (ok=${ok}, fail=${fail})\r\n`);
    }
}

console.log(`\n=== 전체 11172자 검사 완료 ===`);
console.log(`정상: ${ok}`);
console.log(`이상: ${fail}`);
if (fails.length > 0) {
    fails.forEach(f => console.log(' -', f));
} else {
    console.log('✅ 전체 11172자 NaN/범위 검사 통과!');
}
