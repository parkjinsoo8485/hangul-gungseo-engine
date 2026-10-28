const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const vm = require('vm');

// Extract JS from HTML
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

// Get JAMO_DB from sandbox
const JAMO_DB = vm.runInContext('JAMO_DB', sandbox);

// Audit JAMO_DB for stroke direction issues
// JAMO_DB format: { 'ㄱ': [ [[x,y,p], [x,y,p], ...], ...], ... }
// Coords are normalized 0-1, y=0 is top, y=1 is bottom (SVG convention)
const issues = [];

function analyzeJamoStroke(pts) {
    const start = pts[0];
    const end = pts[pts.length - 1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1]; // In normalized coords: dy > 0 = downward (correct!)
    
    let totalLen = 0;
    for (let i = 1; i < pts.length; i++) {
        totalLen += Math.hypot(pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]);
    }
    const avgStep = pts.length > 1 ? totalLen / (pts.length - 1) : 0.01;
    const closeDist = Math.hypot(dx, dy);
    const isClosed = pts.length > 5 && closeDist < avgStep * 2.5;
    
    const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
    const isVertical = Math.abs(dy) > Math.abs(dx) * 1.5;
    
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    pts.forEach(([x, y]) => {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    });
    
    return { start, end, dx, dy, length: closeDist, totalLen, isClosed, isHorizontal, isVertical, minX, maxX, minY, maxY };
}

// In JAMO_DB, x=0 left, x=1 right, y=0 top, y=1 bottom
// Horizontal stroke: dx > 0 (left to right) ✓
// Vertical stroke: dy > 0 (top to bottom) ✓

console.log('JAMO_DB keys:', Object.keys(JAMO_DB));

for (const [char, strokes] of Object.entries(JAMO_DB)) {
    strokes.forEach((st, idx) => {
        const a = analyzeJamoStroke(st);
        
        if (a.isClosed) return;
        
        // Horizontal: must go left to right
        if (a.isHorizontal && a.dx < -0.15) {
            issues.push(`[DB] '${char}' stroke ${idx}: 수평 획 반대방향(R->L) dx=${a.dx.toFixed(3)}`);
        }
        
        // Vertical: must go top to bottom (dy > 0)
        if (a.isVertical && a.dy < -0.15) {
            issues.push(`[DB] '${char}' stroke ${idx}: 수직 획 반대방향(B->T) dy=${a.dy.toFixed(3)}`);
        }
    });

    // ㅂ: 4 strokes, 0=left vertical, 1=right vertical, 2=middle horiz, 3=bottom horiz
    if (char === 'ㅂ' && strokes.length === 4) {
        const [a0, a1, a2, a3] = strokes.map(analyzeJamoStroke);
        if (a0.start[0] > a1.start[0] + 0.1) {
            issues.push(`[DB] 'ㅂ': 왼쪽 세로획이 오른쪽보다 우측`);
        }
        if (a2.start[1] > a3.start[1] + 0.05) {
            issues.push(`[DB] 'ㅂ': 중간 가로획이 아래 가로획보다 낮음`);
        }
    }

    // ㅍ: 4 strokes, 0=top horiz, 1=left vertical, 2=right vertical, 3=bottom horiz
    if (char === 'ㅍ' && strokes.length === 4) {
        const [a0, a1, a2, a3] = strokes.map(analyzeJamoStroke);
        if (!a0.isHorizontal) issues.push(`[DB] 'ㅍ': 1획이 수평이 아님`);
        if (!a3.isHorizontal) issues.push(`[DB] 'ㅍ': 4획이 수평이 아님`);
        if (a0.start[1] > a3.start[1]) issues.push(`[DB] 'ㅍ': 1획(위)이 4획(아래)보다 낮음`);
    }

    // ㄹ: 3 strokes, 0=top ㄱ, 1=middle horiz, 2=bottom ㄴ
    if (char === 'ㄹ' && strokes.length === 3) {
        const [a0, a1, a2] = strokes.map(analyzeJamoStroke);
        if (a0.start[1] > a1.start[1] + 0.05) issues.push(`[DB] 'ㄹ': 1획이 2획보다 낮음`);
        if (a1.start[1] > a2.start[1] + 0.05) issues.push(`[DB] 'ㄹ': 2획이 3획보다 낮음`);
    }

    // ㅌ: 3 strokes, 0=top horiz, 1=middle horiz, 2=bottom ㄴ
    if (char === 'ㅌ' && strokes.length === 3) {
        const [a0, a1, a2] = strokes.map(analyzeJamoStroke);
        if (a0.start[1] > a1.start[1] + 0.05) issues.push(`[DB] 'ㅌ': 1획이 2획보다 낮음`);
    }

    // ㅎ: 3 strokes, 0=dot, 1=horiz, 2=circle
    if (char === 'ㅎ' && strokes.length === 3) {
        const [a0, a1, a2] = strokes.map(analyzeJamoStroke);
        if (a0.start[1] > a1.start[1] + 0.05) issues.push(`[DB] 'ㅎ': 방점이 가로획보다 낮음`);
    }
}

console.log('\n=== JAMO_DB 획순 검사 결과 ===');
console.log('총 문제 수:', issues.length);
issues.forEach(iss => console.log(' - ' + iss));
if (issues.length === 0) {
    console.log('✅ JAMO_DB 모든 자소 획순 검사 통과!');
}
