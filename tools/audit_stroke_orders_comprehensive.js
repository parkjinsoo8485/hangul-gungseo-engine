const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1. Load warehouse JSON
const whJsonPath = path.join(__dirname, '..', 'hangul_150_parts_warehouse.json');
const rawWh = JSON.parse(fs.readFileSync(whJsonPath, 'utf8'));
const jsonParts = rawWh.parts;

// 2. Load warehouse_centerlines.js
const clPath = path.join(__dirname, '..', 'warehouse_centerlines.js');
const s = { window: {} };
vm.runInNewContext(fs.readFileSync(clPath, 'utf8'), s);
const clParts = s.window.HANGUL_WH_CENTERLINES.parts;

console.log(`Auditing ${Object.keys(jsonParts).length} JSON parts and ${Object.keys(clParts).length} Centerlines parts...`);

const issues = [];

function checkPart(id, p, source, medians) {
    const c = p.c || p.char;
    const role = p.r || p.role;
    const formType = p.t || p.formType;
    const box = p.b || (p.box ? [p.box.x, p.box.y, p.box.w, p.box.h] : [0,0,1024,1024]);
    const [bx, by, bw, bh] = box;

    if (!medians || !medians.length) {
        issues.push({ id, source, type: 'NO_MEDIANS' });
        return;
    }

    // 1. Check points in box (HanziWriter coords: y goes up)
    medians.forEach((st, sIdx) => {
        if (st.length < 2) {
            issues.push({ id, source, type: 'TOO_FEW_POINTS', stroke: sIdx, count: st.length });
            return;
        }

        // Direction checks
        const first = st[0];
        const last = st[st.length - 1];
        const dx = last[0] - first[0];
        const dy = last[1] - first[1]; // dy < 0 means downward in HanziWriter coords

        // Is it closed loop?
        const isClosed = Math.hypot(dx, dy) < 25;
        if (isClosed) {
            // Check winding direction: HanziWriter requires counterclockwise (top -> left -> bottom -> right -> top)
            // In typical coords (x right, y up), counter-clockwise gives positive signed area!
            let signedArea = 0;
            for (let i = 0; i < st.length; i++) {
                const cur = st[i];
                const next = st[(i + 1) % st.length];
                signedArea += (cur[0] * next[1] - next[0] * cur[1]);
            }
            if (signedArea < 0) {
                issues.push({ id, source, type: 'LOOP_CLOCKWISE_REVERSED', stroke: sIdx });
            }
        } else {
            // If horizontal stroke (|dx| > 2 * |dy| and |dx| > 40)
            if (Math.abs(dx) > 1.8 * Math.abs(dy) && Math.abs(dx) > 40) {
                if (dx < -15) {
                    issues.push({ id, source, type: 'HORIZ_STROKE_REVERSED', stroke: sIdx, dx, dy, first, last });
                }
            }
            // If vertical stroke (|dy| > 1.8 * |dx| and |dy| > 40)
            // Downward means dy < 0!
            if (Math.abs(dy) > 1.8 * Math.abs(dx) && Math.abs(dy) > 40) {
                if (dy > 15) {
                    issues.push({ id, source, type: 'VERT_STROKE_REVERSED (drawn bottom-to-top)', stroke: sIdx, dx, dy, first, last });
                }
            }
        }

        // Check if points are within reasonable bounds of box
        st.forEach(([x, y], pIdx) => {
            const tol = 35;
            if (x < bx - tol || x > bx + bw + tol || y < by - tol || y > by + bh + tol) {
                issues.push({ id, source, type: 'OUT_OF_BOUNDS', stroke: sIdx, point: pIdx, pt: [x, y], box });
            }
        });
    });

    // 2. Stroke order checks by character
    const avgYs = medians.map(st => st.reduce((acc, pt) => acc + pt[1], 0) / st.length);
    const avgXs = medians.map(st => st.reduce((acc, pt) => acc + pt[0], 0) / st.length);

    // ㄹ: 3 strokes. Order: top ㄱ (high y) -> middle bar (mid y) -> bottom ㄴ (low y)
    if (c === 'ㄹ') {
        if (medians.length !== 3) {
            issues.push({ id, source, type: 'RIEUL_STROKE_COUNT', count: medians.length });
        } else {
            if (avgYs[0] < avgYs[1] || avgYs[1] < avgYs[2]) {
                issues.push({ id, source, type: 'RIEUL_STROKE_ORDER_INVERTED', avgYs });
            }
        }
    }

    // ㄷ: 2 strokes. Order: top bar (high y) -> bottom ㄴ (lower y)
    if (c === 'ㄷ') {
        if (medians.length === 2) {
            if (avgYs[0] < avgYs[1] - 20) {
                issues.push({ id, source, type: 'DIGEUT_STROKE_ORDER_INVERTED', avgYs });
            }
        }
    }

    // ㅌ: 3 strokes. Order: top bar -> mid bar -> bottom ㄴ
    if (c === 'ㅌ') {
        if (medians.length === 3) {
            if (avgYs[0] < avgYs[1] || avgYs[1] < avgYs[2] - 30) {
                issues.push({ id, source, type: 'TIEUT_STROKE_ORDER_INVERTED', avgYs });
            }
        }
    }

    // ㅂ: 4 strokes. Order: left vert -> right vert -> mid bar -> bottom bar
    if (c === 'ㅂ') {
        if (medians.length === 4) {
            if (avgXs[0] > avgXs[1] + 20) {
                issues.push({ id, source, type: 'BIEUP_PILLARS_SWAPPED', avgXs });
            }
            if (avgYs[2] < avgYs[3] - 20) {
                issues.push({ id, source, type: 'BIEUP_BARS_SWAPPED', avgYs });
            }
        }
    }

    // ㅍ: 4 strokes. Order: top bar -> left vert -> right vert -> bottom bar
    if (c === 'ㅍ') {
        if (medians.length === 4) {
            if (avgYs[0] < avgYs[3]) {
                issues.push({ id, source, type: 'PIEUP_BARS_SWAPPED', avgYs });
            }
            if (avgXs[1] > avgXs[2] + 20) {
                issues.push({ id, source, type: 'PIEUP_PILLARS_SWAPPED', avgXs });
            }
        }
    }

    // ㅎ: 3 strokes. Order: top dot -> horizontal shoulder -> circle
    if (c === 'ㅎ') {
        if (medians.length === 3) {
            if (avgYs[0] < avgYs[1] || avgYs[1] < avgYs[2]) {
                issues.push({ id, source, type: 'HIEUT_STROKE_ORDER_INVERTED', avgYs });
            }
        }
    }

    // ㅓ: 2 strokes. Order: branch (left) -> vertical stem (right)
    if (c === 'ㅓ') {
        if (medians.length === 2) {
            if (avgXs[0] > avgXs[1] + 30) {
                issues.push({ id, source, type: 'EO_STROKE_ORDER_SWAPPED', avgXs });
            }
        }
    }

    // ㅗ: 2 strokes. Order: vertical branch (high y) -> horizontal bar (lower y)
    if (c === 'ㅗ') {
        if (medians.length === 2) {
            if (avgYs[0] < avgYs[1] - 30) {
                issues.push({ id, source, type: 'O_STROKE_ORDER_SWAPPED', avgYs });
            }
        }
    }

    // ㅜ: 2 strokes. Order: horizontal bar (high y) -> vertical branch (lower y)
    if (c === 'ㅜ') {
        if (medians.length === 2) {
            if (avgYs[0] < avgYs[1] - 30) {
                issues.push({ id, source, type: 'U_STROKE_ORDER_SWAPPED', avgYs });
            }
        }
    }
}

// Audit JSON
for (const [id, p] of Object.entries(jsonParts)) {
    checkPart(id, p, 'JSON', p.medians);
}

// Audit centerlines.js
for (const [id, p] of Object.entries(clParts)) {
    checkPart(id, p, 'CENTERLINES', p.m);
}

console.log(`\n=== Total issues detected: ${issues.length} ===`);
issues.forEach(iss => console.log(JSON.stringify(iss)));
