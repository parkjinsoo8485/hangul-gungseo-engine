const fs = require('fs');
const path = require('path');

global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;
const issues = [];

// Helper to determine stroke nature in HanziWriter coords (y=900 top, y=0 bottom, x=0 left, x=1024 right)
function analyzeHWStroke(st) {
    const start = st[0];
    const end = st[st.length - 1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1]; // dy > 0 is upwards, dy < 0 is downwards
    const length = Math.hypot(dx, dy);
    
    // check if closed loop
    const isClosed = length < 40 && st.length > 5;
    
    const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.4;
    const isVertical = Math.abs(dy) > Math.abs(dx) * 1.4;
    
    // min and max coords
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    st.forEach(([x, y]) => {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    });

    return { start, end, dx, dy, length, isClosed, isHorizontal, isVertical, minX, maxX, minY, maxY };
}

// 1. Audit warehouse_centerlines.js
for (const [id, p] of Object.entries(parts)) {
    const { c: char, r: role, t: type, m: strokes } = p;
    const analysis = strokes.map(analyzeHWStroke);

    // Check directions
    strokes.forEach((st, idx) => {
        const a = analysis[idx];
        if (a.isClosed) {
            // Check ㅇ or ㅎ circle direction: should be counter-clockwise in screen coords
            // In screen coords, top is y=0, bottom is y=900.
            // In HanziWriter coords: y is inverted.
            // Let's compute signed area in HanziWriter coords
            let area = 0;
            for (let i = 0; i < st.length - 1; i++) {
                area += (st[i][0] * st[i+1][1] - st[i+1][0] * st[i][1]);
            }
            // If area > 0 vs < 0
        } else {
            // Horizontal stroke: must go left to right (dx > 0)
            if (a.isHorizontal && a.dx < -30) {
                issues.push(`[WH] ${id} stroke ${idx}: Horizontal stroke drawn RIGHT-to-LEFT! dx=${a.dx}`);
            }
            // Vertical stroke: must go top to bottom (dy < 0 in HanziWriter)
            if (a.isVertical && a.dy > 30) {
                issues.push(`[WH] ${id} stroke ${idx}: Vertical stroke drawn BOTTOM-to-TOP! dy=${a.dy}`);
            }
        }
    });

    // Check consonant specific order
    if (char === 'ㅂ') {
        // ㅂ: 4 strokes
        // 0: left vertical (top to bottom)
        // 1: right vertical (top to bottom)
        // 2: middle horizontal (left to right)
        // 3: bottom horizontal (left to right)
        if (strokes.length === 4) {
            const [s0, s1, s2, s3] = analysis;
            // s0 should be left of s1
            if (s0.start[0] > s1.start[0]) issues.push(`[WH] ${id}: ㅂ left stem is to the right of right stem!`);
            // s0 and s1 should be vertical
            if (!s0.isVertical) issues.push(`[WH] ${id}: ㅂ stroke 0 is not vertical!`);
            if (!s1.isVertical) issues.push(`[WH] ${id}: ㅂ stroke 1 is not vertical!`);
            // s2 should be above s3 (in HW, y is higher)
            if (s2.start[1] < s3.start[1]) issues.push(`[WH] ${id}: ㅂ middle bar is lower than bottom bar!`);
        }
    } else if (char === 'ㅍ') {
        // ㅍ: 4 strokes
        // 0: top horizontal (left to right)
        // 1: left vertical (top to bottom)
        // 2: right vertical (top to bottom)
        // 3: bottom horizontal (left to right)
        if (strokes.length === 4) {
            const [s0, s1, s2, s3] = analysis;
            if (!s0.isHorizontal) issues.push(`[WH] ${id}: ㅍ stroke 0 is not horizontal!`);
            if (s0.start[1] < s3.start[1]) issues.push(`[WH] ${id}: ㅍ stroke 0 is lower than stroke 3!`);
            if (s1.start[0] > s2.start[0]) issues.push(`[WH] ${id}: ㅍ left stem is to the right of right stem!`);
        }
    } else if (char === 'ㅌ') {
        // ㅌ: 3 strokes
        // 0: top horizontal
        // 1: middle horizontal
        // 2: bottom ㄴ-shape (down then right)
        if (strokes.length === 3) {
            const [s0, s1, s2] = analysis;
            // s0 should be above s1 (s0.start[1] > s1.start[1])
            if (s0.start[1] < s1.start[1]) issues.push(`[WH] ${id}: ㅌ stroke 0 is lower than stroke 1!`);
        }
    } else if (char === 'ㄹ') {
        // ㄹ: 3 strokes
        // 0: top ㄱ
        // 1: middle horizontal
        // 2: bottom ㄴ
        if (strokes.length === 3) {
            const [s0, s1, s2] = analysis;
            if (s0.start[1] < s1.start[1]) issues.push(`[WH] ${id}: ㄹ stroke 0 is lower than stroke 1!`);
            if (s1.start[1] < s2.start[1]) issues.push(`[WH] ${id}: ㄹ stroke 1 is lower than stroke 2!`);
        }
    } else if (char === 'ㅁ') {
        // ㅁ: 3 strokes
        // 0: left vertical
        // 1: ㄱ-shape
        // 2: bottom horizontal
        if (strokes.length === 3) {
            const [s0, s1, s2] = analysis;
            if (!s0.isVertical) issues.push(`[WH] ${id}: ㅁ stroke 0 is not vertical!`);
        }
    } else if (char === 'ㄷ') {
        // ㄷ: 2 strokes
        // 0: top horizontal
        // 1: ㄴ-shape
        if (strokes.length === 2) {
            const [s0, s1] = analysis;
            if (s0.start[1] < s1.start[1]) issues.push(`[WH] ${id}: ㄷ stroke 0 is lower than stroke 1!`);
        }
    } else if (char === 'ㅎ') {
        // ㅎ: 3 strokes
        // 0: top dot/short horizontal
        // 1: middle horizontal
        // 2: bottom circle
        if (strokes.length === 3) {
            const [s0, s1, s2] = analysis;
            if (s0.start[1] < s1.start[1]) issues.push(`[WH] ${id}: ㅎ stroke 0 is lower than stroke 1!`);
            if (s1.start[1] < s2.maxY) issues.push(`[WH] ${id}: ㅎ stroke 1 is lower than circle top!`);
        }
    }
}

console.log('=== Warehouse Audit Results ===');
console.log('Total issues found:', issues.length);
issues.forEach(iss => console.log(' - ' + iss));
