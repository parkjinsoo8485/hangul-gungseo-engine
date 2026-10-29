const fs = require('fs');
let code = fs.readFileSync('tools/harness_random_sampling_video_precision.js', 'utf8');

const oldCutoff = "const cutoffs = strokeStats.filter(st => st.ptsSpan > 80 && st.pixSpan < st.ptsSpan * 0.70);";
const newCutoff = `const cutoffs = strokeStats.filter(st => {
                    const meta = Engine.strokeMeta && Engine.strokeMeta[st.sIdx];
                    if (meta && meta.part === 'jong') {
                        const jb = (Engine.jamoBoxes && Engine.jamoBoxes[0]) || {};
                        const maxJongH = (jb.jongY2 && jb.jongY1) ? (jb.jongY2 - jb.jongY1) : 65;
                        const effPtsSpan = Math.min(st.ptsSpan, maxJongH * 0.95);
                        return effPtsSpan > 45 && st.pixSpan < effPtsSpan * 0.55;
                    }
                    return st.ptsSpan > 80 && st.pixSpan < st.ptsSpan * 0.70;
                });`;

if (!code.includes(oldCutoff)) {
    console.error('oldCutoff not found!');
    process.exit(1);
}
code = code.replace(oldCutoff, newCutoff);
fs.writeFileSync('tools/harness_random_sampling_video_precision.js', code, 'utf8');
console.log('Successfully updated cutoff criteria in harness_random_sampling_video_precision.js');
