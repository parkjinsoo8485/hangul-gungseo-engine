const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. In entriesToRaw, include whId in metaPer
const t1 = `mapped.forEach(() => metaPer[e.ci].push({
                ci: e.ci,
                ei,
                part: e.part || 'single',
                subPart: e.subPart || 'single',
                vType: e.vType || 'V',
                hasJong: !!e.hasJong,
                jongChar: e.jongChar || '',
                rScale: e.fbox ? 1.0 : (e.rScale || 1.0)
            }));`;

const r1 = `mapped.forEach(() => metaPer[e.ci].push({
                ci: e.ci,
                ei,
                part: e.part || 'single',
                subPart: e.subPart || 'single',
                vType: e.vType || 'V',
                hasJong: !!e.hasJong,
                jongChar: e.jongChar || '',
                whId: e.whId || '',
                rScale: e.fbox ? 1.0 : (e.rScale || 1.0)
            }));`;

// 2. In fitEntriesToGlyph, fix isLeftTick so double vowels don't leak left
const t2 = `const isLeftTick = ['ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅞ', 'ㅙ'].some(v => (e.whId || e.char || '').includes(v));`;
const r2 = `const isLeftTick = ['ㅓ', 'ㅕ'].some(v => (e.whId || e.char || '').includes(v));`;

// 3. In fitEntriesToGlyph, clamp jong box so it doesn't bleed right
const t3 = `} else if (e.part === 'jong') {
                        if (e.fbox[1] < jongY1 - 1) {
                            const bot = e.fbox[1] + e.fbox[3];
                            e.fbox[1] = jongY1 - 1;
                            e.fbox[3] = Math.max(14, bot - e.fbox[1]);
                        }
                    }`;

const r3 = `} else if (e.part === 'jong') {
                        if (e.fbox[1] < jongY1 - 1) {
                            const bot = e.fbox[1] + e.fbox[3];
                            e.fbox[1] = jongY1 - 1;
                            e.fbox[3] = Math.max(14, bot - e.fbox[1]);
                        }
                        const actMaxX = (jb && jb.maxX) ? (jb.maxX / s) : 88;
                        if (e.fbox[0] + e.fbox[2] > actMaxX + 0.5) {
                            e.fbox[2] = Math.max(16, actMaxX + 0.2 - e.fbox[0]);
                        }
                    }`;

// 4. In coordinate descent (fitEntriesToGlyph), prevent jong box from expanding past maxX
const t4 = `if (p >= 2 && (nb[p] < e.def[p] * minScale || nb[p] > e.def[p] * 1.18)) continue;
                                if (jb) {`;

const r4 = `if (p >= 2 && (nb[p] < e.def[p] * minScale || nb[p] > e.def[p] * 1.18)) continue;
                                if (jb) {
                                    if (e.part === 'jong') {
                                        const actMaxX = (jb && jb.maxX) ? (jb.maxX / s) : 88;
                                        if (nb[0] + nb[2] > actMaxX + 0.5) continue;
                                    }`;

// 5. In coordinate descent, fix isLT for jung
const t5 = `const isLT = ['ㅓ', 'ㅔ', 'ㅕ', 'ㅖ'].some(v => (e.whId || e.char || '').includes(v));
                                            if (nb[0] < (isLT ? splitX - 5 : splitX - 1)) continue;`;

const r5 = `const isLT = ['ㅓ', 'ㅕ'].some(v => (e.whId || e.char || '').includes(v));
                                            if (nb[0] < (isLT ? splitX - 5 : splitX - 1)) continue;`;

// 6. In stroke offset calculation (fitEntriesToGlyph), fix isLT and prevent legs of ㅊ / ㅈ from crossing
const t6 = `const isLT = ['ㅓ', 'ㅔ', 'ㅕ', 'ㅖ'].some(v => (e.whId || e.char || '').includes(v));
                                if (minSmpX + dx < (isLT ? splitX - 5 : splitX - 1)) return 1e6;`;

const r6 = `const isLT = ['ㅓ', 'ㅕ'].some(v => (e.whId || e.char || '').includes(v));
                                if (minSmpX + dx < (isLT ? splitX - 5 : splitX - 1)) return 1e6;`;

// 7. Prevent legs of ㅊ / ㅈ crossing in sc(dx, dy)
const t7 = `let A = 0, Cp = 0, ov = 0;
                    samples.forEach(p => {`;

const r7 = `if (e.part === 'cho') {
                        if ((e.whId || '').includes('ㅊ') && si === 3) {
                            const leg2StartX = b[0] + e.norm[2][0][0] * b[2] + e.so[2][0];
                            const curStartX = b[0] + st[0][0] * b[2] + dx;
                            if (curStartX < leg2StartX + 0.5) return 1e6;
                        } else if ((e.whId || '').includes('ㅈ') && si === 2) {
                            const leg1StartX = b[0] + e.norm[1][0][0] * b[2] + e.so[1][0];
                            const curStartX = b[0] + st[0][0] * b[2] + dx;
                            if (curStartX < leg1StartX + 0.5) return 1e6;
                        }
                    }
                    let A = 0, Cp = 0, ov = 0;
                    samples.forEach(p => {`;

// 8. In buildGlyphData, trim whitespace tail from jong as well as jung
const t8 = `while (iEnd > checkStart && meta.part === 'jung' && !onInk[iEnd]) iEnd--;`;
const r8 = `while (iEnd > checkStart && (meta.part === 'jung' || meta.part === 'jong') && !onInk[iEnd]) iEnd--;`;

// 9. In backward extension loop, prevent double vowel from extending left, and prevent diagonal cho stroke from extending up into horizontal bar
const t9 = `if (meta.part === 'jung' && meta.subPart === 'jung_v' && lx100 < splitX - 1.0) break;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'V') && lx100 > splitX - 0.5) break;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'H') && sy > choY2 + 0.5) break;`;

const r9 = `if (meta.part === 'jung' && meta.subPart === 'jung_v') {
                                const isDoubleV = ['ㅐ', 'ㅔ', 'ㅒ', 'ㅖ', 'ㅙ', 'ㅞ'].some(v => (meta.whId || '').includes(v));
                                const leftLimit = isDoubleV ? (splitX + 0.5) : (splitX - 1.0);
                                if (lx100 < leftLimit) break;
                            }
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'V') && lx100 > splitX - 0.5) break;
                            if (meta.part === 'cho' && (meta.vType === 'C' || meta.vType === 'H') && sy > choY2 + 0.5) break;
                            if (meta.part === 'cho' && first[4] === 'D' && sy < first[1] - 0.2) break;`;

// 10. In forward extension loop, prevent double vowel from extending left of splitX, and prevent jong from extending right past maxX
const t10 = `if (meta.part === 'jung' && meta.subPart === 'jung_v' && lx100 < splitX - 1.0) break;
                            if (meta.part === 'jong' && ey < jongY1 - 0.5) break;`;

const r10 = `if (meta.part === 'jung' && meta.subPart === 'jung_v') {
                                const isDoubleV = ['ㅐ', 'ㅔ', 'ㅒ', 'ㅖ', 'ㅙ', 'ㅞ'].some(v => (meta.whId || '').includes(v));
                                const leftLimit = isDoubleV ? (splitX + 0.5) : (splitX - 1.0);
                                if (lx100 < leftLimit) break;
                            }
                            if (meta.part === 'jong' && ey < jongY1 - 0.5) break;
                            if (meta.part === 'jong' && isLastH) {
                                const maxJongRight = (jb && jb.maxX) ? (jb.maxX * 100 / R + 0.2) : 88;
                                if (lx100 > maxJongRight) break;
                            }`;

let edits = [
    [t1, r1, 'metaPer whId'],
    [t2, r2, 'isLeftTick double vowels'],
    [t3, r3, 'jong fbox maxX clamp'],
    [t4, r4, 'coord descent jong maxX clamp'],
    [t5, r5, 'coord descent isLT'],
    [t6, r6, 'stroke offset isLT'],
    [t7, r7, 'prevent ㅊ/ㅈ leg crossing'],
    [t8, r8, 'trim jong tail off-ink'],
    [t9, r9, 'backward extension clamps'],
    [t10, r10, 'forward extension clamps']
];

let applied = 0;
edits.forEach(([target, repl, name]) => {
    const normHtml = html.replace(/\r\n/g, '\n');
    const normTarget = target.replace(/\r\n/g, '\n');
    if (normHtml.includes(normTarget)) {
        html = normHtml.replace(normTarget, repl.replace(/\r\n/g, '\n'));
        console.log('Applied edit:', name);
        applied++;
    } else {
        console.error('Failed to find target for edit:', name);
    }
});

if (applied === edits.length) {
    fs.writeFileSync('index.html', html, 'utf8');
    console.log('All', applied, 'edits successfully written to index.html!');
} else {
    console.error('Aborting: only', applied, 'of', edits.length, 'edits succeeded.');
    process.exit(1);
}
