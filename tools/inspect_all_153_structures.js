const fs = require('fs');
global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;
const structuralIssues = [];

for (const [id, p] of Object.entries(parts)) {
    const { c: ch, r: role, t: type, m: strokes } = p;

    // Check ㄷ (2 strokes: s0=top horiz, s1=ㄴ from top-left down then right)
    if (ch === 'ㄷ' && strokes.length === 2) {
        const [s0, s1] = strokes;
        const dy = Math.abs(s1[0][1] - s0[0][1]);
        const dx = Math.abs(s1[0][0] - s0[0][0]);
        if (dy > 60 || dx > 180) {
            structuralIssues.push(`${id} (ㄷ): s1 start [${s1[0]}] too far from s0 start [${s0[0]}] (dx=${dx}, dy=${dy})`);
        }
    }

    // Check ㄸ (4 strokes: two ㄷs)
    if (ch === 'ㄸ' && strokes.length === 4) {
        const [s0, s1, s2, s3] = strokes;
        if (Math.abs(s1[0][1] - s0[0][1]) > 60) {
            structuralIssues.push(`${id} (ㄸ left): s1 start [${s1[0]}] too far below s0 start [${s0[0]}]`);
        }
        if (Math.abs(s3[0][1] - s2[0][1]) > 60) {
            structuralIssues.push(`${id} (ㄸ right): s3 start [${s3[0]}] too far below s2 start [${s2[0]}]`);
        }
    }

    // Check ㅌ (3 strokes: s0=top horiz, s1=mid horiz, s2=ㄴ starting near top-left s0[0]!)
    if (ch === 'ㅌ' && strokes.length === 3) {
        const [s0, s1, s2] = strokes;
        if (Math.abs(s2[0][1] - s1[0][1]) > 60) {
            structuralIssues.push(`${id} (ㅌ): s2 start [${s2[0]}] does not start at top-left s0[0] [${s0[0]}]! (dy=${Math.abs(s1[0][1] - s2[0][1])})`);
        }
    }

    // Check ㄹ (3 strokes: s0=ㄱ, s1=mid horiz meeting s0 end, s2=ㄴ starting near s1 start)
    if (ch === 'ㄹ' && strokes.length === 3) {
        const [s0, s1, s2] = strokes;
        const s0End = s0[s0.length - 1];
        const s1End = s1[s1.length - 1];
        if (Math.abs(s0End[1] - s1End[1]) > 65) {
            structuralIssues.push(`${id} (ㄹ): s0 end [${s0End}] and s1 end [${s1End}] y-mismatch=${Math.abs(s0End[1] - s1End[1])}`);
        }
        if (Math.abs(s2[0][1] - s1[0][1]) > 65 || Math.abs(s2[0][0] - s1[0][0]) > 120) {
            structuralIssues.push(`${id} (ㄹ): s2 start [${s2[0]}] disconnected from s1 start [${s1[0]}]`);
        }
    }

    // Check ㅁ (3 strokes: s0=left vert, s1=ㄱ starting near s0[0], s2=bot horiz connecting s0 end and s1 end)
    if (ch === 'ㅁ' && strokes.length === 3) {
        const [s0, s1, s2] = strokes;
        if (Math.hypot(s1[0][0] - s0[0][0], s1[0][1] - s0[0][1]) > 140) {
            structuralIssues.push(`${id} (ㅁ): s1 start [${s1[0]}] far from s0 start [${s0[0]}]`);
        }
    }

    // Check compound vowels (ㅘ, ㅙ, ㅚ, ㅝ, ㅞ, ㅟ, ㅢ)
    if (['ㅘ', 'ㅙ', 'ㅚ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅢ'].includes(ch)) {
        strokes.forEach((st, si) => {
            const dx = st[st.length - 1][0] - st[0][0];
            const dy = st[st.length - 1][1] - st[0][1];
            if (Math.abs(dx) > Math.abs(dy) && dx < 0) {
                structuralIssues.push(`${id} (${ch}) s${si}: horizontal stroke reversed!`);
            }
            if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
                structuralIssues.push(`${id} (${ch}) s${si}: vertical stroke reversed (bottom-to-top)!`);
            }
        });
    }
    if (ch === 'ㅙ' && strokes.length === 5) {
        // s0=ㅗ vert, s1=ㅗ horiz, s2=ㅐ left vert, s3=ㅐ mid horiz, s4=ㅐ right vert
        const x2 = strokes[2].reduce((a, b) => a + b[0], 0) / strokes[2].length;
        const x4 = strokes[4].reduce((a, b) => a + b[0], 0) / strokes[4].length;
        if (x4 - x2 < 50) {
            structuralIssues.push(`${id} (ㅙ): vertical stems s2 (${x2.toFixed(0)}) and s4 (${x4.toFixed(0)}) too close!`);
        }
    }
    if (ch === 'ㅞ' && strokes.length === 5) {
        // s0=ㅜ horiz, s1=ㅜ vert, s2=ㅔ horiz, s3=ㅔ left vert, s4=ㅔ right vert
        const x3 = strokes[3].reduce((a, b) => a + b[0], 0) / strokes[3].length;
        const x4 = strokes[4].reduce((a, b) => a + b[0], 0) / strokes[4].length;
        if (x4 - x3 < 50) {
            structuralIssues.push(`${id} (ㅞ): vertical stems s3 (${x3.toFixed(0)}) and s4 (${x4.toFixed(0)}) too close!`);
        }
    }
}

console.log(`=== Structural Issues (${structuralIssues.length}) ===`);
structuralIssues.forEach(s => console.log(' - ' + s));
