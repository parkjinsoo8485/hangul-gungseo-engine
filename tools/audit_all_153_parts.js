const fs = require('fs');
global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;
const findings = [];

for (const [id, p] of Object.entries(parts)) {
    const { c: ch, r: role, t: type, b: box, m: strokes } = p;
    const [bx, by, bw, bh] = box;

    // 1. Check if any stroke points are far outside the declared box `b`
    strokes.forEach((st, si) => {
        st.forEach(([x, y], pi) => {
            if (x < bx - 60 || x > bx + bw + 60 || y < by - 60 || y > by + bh + 60) {
                findings.push(`${id} s${si} pt${pi} [${x},${y}] outside box [${bx},${by},${bw},${bh}]`);
            }
        });
    });

    // 2. Check parallel strokes overlapping (e.g., ㅐ, ㅒ, ㅔ, ㅖ, ㅂ, ㅍ, ㅛ, ㅠ, ㄲ, ㄸ, ㅃ, ㅆ, ㅉ)
    if (['ㅐ', 'ㅔ'].includes(ch) && strokes.length === 3) {
        // s0 or s1 is left vertical, s2 is right vertical
        const v1 = ch === 'ㅐ' ? strokes[0] : strokes[1];
        const v2 = strokes[2];
        const x1 = v1.reduce((a, b) => a + b[0], 0) / v1.length;
        const x2 = v2.reduce((a, b) => a + b[0], 0) / v2.length;
        if (x2 - x1 < 60) {
            findings.push(`${id} (${ch}): two vertical stems too close or reversed! x1=${x1.toFixed(0)}, x2=${x2.toFixed(0)}`);
        }
    }
    if (['ㅒ', 'ㅖ'].includes(ch) && strokes.length === 4) {
        const v1 = ch === 'ㅒ' ? strokes[0] : strokes[2];
        const v2 = strokes[3];
        const x1 = v1.reduce((a, b) => a + b[0], 0) / v1.length;
        const x2 = v2.reduce((a, b) => a + b[0], 0) / v2.length;
        if (x2 - x1 < 60) {
            findings.push(`${id} (${ch}): two vertical stems too close or overlapping! x1=${x1.toFixed(0)}, x2=${x2.toFixed(0)}`);
        }
    }

    // 3. Check ㅛ and ㅠ vertical ticks
    if (ch === 'ㅛ' && strokes.length === 3) {
        const [s0, s1, s2] = strokes;
        const x0 = s0.reduce((a, b) => a + b[0], 0) / s0.length;
        const x1 = s1.reduce((a, b) => a + b[0], 0) / s1.length;
        const dx0 = Math.abs(s0[s0.length-1][0] - s0[0][0]);
        const dy0 = Math.abs(s0[s0.length-1][1] - s0[0][1]);
        if (x1 - x0 < 60 || dx0 > dy0 * 0.6) {
            findings.push(`${id} (ㅛ): vertical ticks malformed! x0=${x0.toFixed(0)}, x1=${x1.toFixed(0)}, dx0=${dx0}, dy0=${dy0}`);
        }
    }
    if (ch === 'ㅠ' && strokes.length === 3) {
        const [s0, s1, s2] = strokes;
        const x1 = s1.reduce((a, b) => a + b[0], 0) / s1.length;
        const x2 = s2.reduce((a, b) => a + b[0], 0) / s2.length;
        if (x2 - x1 < 60) {
            findings.push(`${id} (ㅠ): vertical stems too close! x1=${x1.toFixed(0)}, x2=${x2.toFixed(0)}`);
        }
    }

    // 4. Check ㅍ: s0=top horiz, s1=left vert, s2=right vert, s3=bot horiz
    if (ch === 'ㅍ' && strokes.length === 4) {
        const [s0, s1, s2, s3] = strokes;
        const topY = (s0[0][1] + s0[s0.length-1][1]) / 2;
        const botY = (s3[0][1] + s3[s3.length-1][1]) / 2;
        const s1BotY = s1[s1.length-1][1];
        const s2BotY = s2[s2.length-1][1];
        const s1TopY = s1[0][1];
        const s2TopY = s2[0][1];
        if (s1BotY < botY - 15 || s2BotY < botY - 15) {
            findings.push(`${id} (ㅍ): vertical pillars poke below bottom horizontal! botY=${botY.toFixed(0)}, s1BotY=${s1BotY}, s2BotY=${s2BotY}`);
        }
        if (s1TopY < topY - 60 || s2TopY < topY - 60) {
            findings.push(`${id} (ㅍ): vertical pillars start too far below top horizontal! topY=${topY.toFixed(0)}, s1TopY=${s1TopY}, s2TopY=${s2TopY}`);
        }
        if (s1BotY > botY + 45 || s2BotY > botY + 45) {
            findings.push(`${id} (ㅍ): vertical pillars stop too high above bottom horizontal! botY=${botY.toFixed(0)}, s1BotY=${s1BotY}, s2BotY=${s2BotY}`);
        }
    }

    // 5. Check ㅂ: s0=left vert, s1=right vert, s2=mid horiz, s3=bot horiz
    if (ch === 'ㅂ' && strokes.length === 4) {
        const [s0, s1, s2, s3] = strokes;
        const x0 = s0.reduce((a, b) => a + b[0], 0) / s0.length;
        const x1 = s1.reduce((a, b) => a + b[0], 0) / s1.length;
        if (x1 - x0 < 80) {
            findings.push(`${id} (ㅂ): vertical stems too close! x0=${x0.toFixed(0)}, x1=${x1.toFixed(0)}`);
        }
    }

    // 6. Check circles in ㅇ, ㅎ, ㄶ, ㅀ
    if (['ㅇ', 'ㅎ', 'ㄶ', 'ㅀ'].includes(ch)) {
        const circleIdx = strokes.length - 1;
        const st = strokes[circleIdx];
        const closeDist = Math.hypot(st[st.length-1][0] - st[0][0], st[st.length-1][1] - st[0][1]);
        if (st.length < 16 || closeDist > 35) {
            findings.push(`${id} (${ch}): circle stroke s${circleIdx} has len=${st.length}, closeDist=${closeDist.toFixed(1)}`);
        }
        // Check for sharp zig-zags in circle
        for (let i = 1; i < st.length - 1; i++) {
            const dx1 = st[i][0] - st[i-1][0], dy1 = st[i][1] - st[i-1][1];
            const dx2 = st[i+1][0] - st[i][0], dy2 = st[i+1][1] - st[i][1];
            const l1 = Math.hypot(dx1, dy1), l2 = Math.hypot(dx2, dy2);
            if (l1 > 5 && l2 > 5) {
                const cos = (dx1*dx2 + dy1*dy2) / (l1 * l2);
                if (cos < -0.2) {
                    findings.push(`${id} (${ch}): circle stroke s${circleIdx} has sharp zig-zag at pt ${i} (cos=${cos.toFixed(2)})`);
                    break;
                }
            }
        }
    }

    // 7. Check any stroke with sharp reversal / self-folding
    strokes.forEach((st, si) => {
        const isCircle = ['ㅇ', 'ㅎ', 'ㄶ', 'ㅀ'].includes(ch) && si === strokes.length - 1;
        if (isCircle) return;
        for (let i = 1; i < st.length - 1; i++) {
            const dx1 = st[i][0] - st[i-1][0], dy1 = st[i][1] - st[i-1][1];
            const dx2 = st[i+1][0] - st[i][0], dy2 = st[i+1][1] - st[i][1];
            const l1 = Math.hypot(dx1, dy1), l2 = Math.hypot(dx2, dy2);
            if (l1 > 10 && l2 > 10) {
                const cos = (dx1*dx2 + dy1*dy2) / (l1 * l2);
                if (cos < -0.5) {
                    findings.push(`${id} (${ch}) s${si}: sharp fold/reversal at pt ${i} (cos=${cos.toFixed(2)}) pts=${JSON.stringify(st)}`);
                }
            }
        }
    });
}

console.log(`=== Audit of all 153 parts in warehouse_centerlines.js (${findings.length} issues) ===`);
findings.forEach(f => console.log(' - ' + f));
