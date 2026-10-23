const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));

console.log('Total parts in warehouse:', Object.keys(raw.parts).length);

const issues = [];

for (const [id, p] of Object.entries(raw.parts)) {
    const { char, role, formType, box, medians, strokeWidths } = p;
    if (!medians || !medians.length) {
        issues.push(`${id}: No medians`);
        continue;
    }

    // Check ㅜ / ㅠ (stem centered on bar)
    if (['ㅜ', 'ㅠ'].includes(char)) {
        // stroke 0 is horizontal bar, subsequent strokes are vertical stems
        const bar = medians[0];
        const barMinX = Math.min(...bar.map(pt => pt[0]));
        const barMaxX = Math.max(...bar.map(pt => pt[0]));
        const barMidX = (barMinX + barMaxX) / 2;
        const barY = (bar[0][1] + bar[bar.length - 1][1]) / 2;

        for (let si = 1; si < medians.length; si++) {
            const stem = medians[si];
            const stemTop = stem[0]; // should start at or near bar
            const stemX = stemTop[0];
            const diff = Math.abs(stemX - barMidX);
            if (char === 'ㅜ' && diff > 50) {
                issues.push(`${id} (ㅜ): stem starting x=${stemX} is ${diff.toFixed(1)}px away from bar mid=${barMidX.toFixed(1)} (bar x=[${barMinX}..${barMaxX}])`);
            }
        }
    }

    // Check ㅗ / ㅛ (stem centered on bar)
    if (['ㅗ', 'ㅛ'].includes(char)) {
        // For ㅗ: stroke 0 is vertical stem, stroke 1 is horizontal bar
        if (char === 'ㅗ' && medians.length === 2) {
            const stem = medians[0];
            const bar = medians[1];
            const barMinX = Math.min(...bar.map(pt => pt[0]));
            const barMaxX = Math.max(...bar.map(pt => pt[0]));
            const barMidX = (barMinX + barMaxX) / 2;
            const stemBotX = stem[stem.length - 1][0];
            const diff = Math.abs(stemBotX - barMidX);
            if (diff > 50) {
                issues.push(`${id} (ㅗ): stem bottom x=${stemBotX} is ${diff.toFixed(1)}px away from bar mid=${barMidX.toFixed(1)}`);
            }
        }
    }

    // Check compound vowels with T2 (with Jongsung)
    if (formType === 2 && ['ㅘ', 'ㅙ', 'ㅚ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅢ'].includes(char)) {
        // In T2 (with batchim), where is the horizontal bar?
        medians.forEach((st, si) => {
            const xs = st.map(p => p[0]);
            const ys = st.map(p => p[1]);
            const w = Math.max(...xs) - Math.min(...xs);
            const h = Math.max(...ys) - Math.min(...ys);
            const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
            // A horizontal bar has w > 200, w > 2 * h
            if (w > 200 && w > 1.8 * h) {
                console.log(`${id} stroke ${si} is horizontal bar: x=[${Math.min(...xs)}..${Math.max(...xs)}] y=[${Math.min(...ys)}..${Math.max(...ys)}] meanY=${meanY.toFixed(1)}`);
                if (meanY > 580) {
                    issues.push(`${id} stroke ${si} horizontal bar meanY=${meanY.toFixed(1)} is too high (should be <= 480 to leave room for Cho)`);
                }
            }
        });
    }
}

console.log('\n=== DETECTED ISSUES ===');
issues.forEach(i => console.log(' - ' + i));
