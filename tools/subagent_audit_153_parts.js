/**
 * Subagent Diagnostic Audit & Replacement Definitions for all 153 Jamo Parts in warehouse_centerlines.js
 * Checks:
 *  1. Stub strokes & wrong orientation (e.g., Cho_T2_ㅎ, Cho_T3_ㅎ, Jong_T1_ㄶ, Jong_T2_ㄶ, Jong_T1_ㅀ, Jong_T2_ㅀ, Jong_T1_ㅊ, Jong_T2_ㅊ, Jung_T2_ㅐ, Jung_T1_ㅕ, Jong_T1_ㅄ, Jong_T2_ㅄ, etc.)
 *  2. Circle bounding box fill & proportions in ㅇ, ㅎ, ㄶ, ㅀ
 *  3. Intra-part stroke collisions/crowding (< 12% of box height apart)
 *  4. Stroke count & order against 국립국어원 표준 획순
 *  5. Box overflow (points outside b that get clamped by WH.partNorm)
 *  6. Malformed complex jongsung strokes (ㄺ, ㄻ, ㄼ, ㄽ, ㄾ, ㄿ, ㅀ, ㄵ, ㅄ)
 */
const fs = require('fs');
const path = require('path');

global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;

function makeCircle(cx, cy, rx, ry, N = 28) {
    const pts = [];
    for (let i = 0; i <= N; i++) {
        const theta = (2 * Math.PI * i) / N;
        const x = Math.round(cx - rx * Math.sin(theta));
        const y = Math.round(cy + ry * Math.cos(theta));
        pts.push([x, y]);
    }
    return pts;
}

const expectedCounts = {
    'ㄱ': [1], 'ㄲ': [2], 'ㄴ': [1], 'ㄷ': [2], 'ㄸ': [4], 'ㄹ': [3], 'ㅁ': [3], 'ㅂ': [4], 'ㅃ': [8],
    'ㅅ': [2], 'ㅆ': [4], 'ㅇ': [1], 'ㅈ': [2, 3], 'ㅉ': [4, 6], 'ㅊ': [3, 4], 'ㅋ': [2], 'ㅌ': [3], 'ㅍ': [4], 'ㅎ': [3],
    'ㅏ': [2], 'ㅐ': [3], 'ㅑ': [3], 'ㅒ': [4], 'ㅓ': [2], 'ㅔ': [3], 'ㅕ': [3], 'ㅖ': [4],
    'ㅗ': [2], 'ㅘ': [4], 'ㅙ': [5], 'ㅚ': [3], 'ㅛ': [3], 'ㅜ': [2], 'ㅝ': [4], 'ㅞ': [5], 'ㅟ': [3], 'ㅠ': [3], 'ㅡ': [1], 'ㅢ': [2], 'ㅣ': [1],
    'ㄳ': [3], 'ㄵ': [3, 4], 'ㄶ': [4], 'ㄺ': [4], 'ㄻ': [6], 'ㄼ': [7], 'ㄽ': [5], 'ㄾ': [6], 'ㄿ': [7], 'ㅀ': [6], 'ㅄ': [6]
};

function distToSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function distToStroke(pt, st) {
    let best = 1e9;
    for (let i = 0; i < st.length - 1; i++) {
        const d = distToSeg(pt[0], pt[1], st[i][0], st[i][1], st[i + 1][0], st[i + 1][1]);
        if (d < best) best = d;
    }
    return best;
}

function auditParts(partsObj) {
    const report = [];
    for (const [id, p] of Object.entries(partsObj)) {
        const [bx, by, bw, bh] = p.b;
        const ch = p.c;
        const m = p.m;
        const issues = [];

        const exp = expectedCounts[ch];
        if (exp && !exp.includes(m.length)) {
            issues.push('STROKE_COUNT: got ' + m.length + ', expected ' + exp.join('/'));
        }

        let pMinX = 1e9, pMaxX = -1e9, pMinY = 1e9, pMaxY = -1e9;
        const stStats = m.map((st, si) => {
            let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, arcLen = 0;
            st.forEach(([x, y], pi) => {
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
                if (pi > 0) arcLen += Math.hypot(x - st[pi - 1][0], y - st[pi - 1][1]);
            });
            if (minX < pMinX) pMinX = minX; if (maxX > pMaxX) pMaxX = maxX;
            if (minY < pMinY) pMinY = minY; if (maxY > pMaxY) pMaxY = maxY;
            const dx = st[st.length - 1][0] - st[0][0];
            const dy = st[st.length - 1][1] - st[0][1];
            const isCircle = st.length > 10 && Math.hypot(dx, dy) < 40;
            const isPureHoriz = !isCircle && st.length <= 4 && Math.abs(dx) > Math.abs(dy) * 2.0;
            const isPureVert = !isCircle && st.length <= 4 && Math.abs(dy) > Math.abs(dx) * 2.0;
            return {
                si, st, minX, maxX, minY, maxY,
                w: maxX - minX, h: maxY - minY,
                meanX: (minX + maxX) / 2, meanY: (minY + maxY) / 2,
                dx, dy, arcLen, isCircle, isPureHoriz, isPureVert
            };
        });

        if (pMinX < bx || pMaxX > bx + bw || pMinY < by || pMaxY > by + bh) {
            issues.push('BOX_OVERFLOW: pts x=[' + pMinX + '..' + pMaxX + '], y=[' + pMinY + '..' + pMaxY + '] vs b=[' + bx + '..' + (bx + bw) + ', ' + by + '..' + (by + bh) + ']');
        }

        stStats.forEach(s => {
            if (!s.isCircle && s.arcLen < 75) {
                issues.push('STUB_STROKE s' + s.si + ': arcLen=' + s.arcLen.toFixed(1) + ', dx=' + s.dx + ', dy=' + s.dy);
            }
            if (!s.isCircle && s.st.length < 3) {
                issues.push('FEW_POINTS s' + s.si + ': len=' + s.st.length);
            }
            if ((ch === 'ㅎ' && s.si === 0) || (ch === 'ㅊ' && s.si === 0) || (ch === 'ㄶ' && s.si === 1) || (ch === 'ㅀ' && s.si === 3)) {
                if (Math.abs(s.dx) < Math.abs(s.dy) * 1.5 || s.w < 90) {
                    issues.push('TOP_DOT_STUB s' + s.si + ': dx=' + s.dx + ', dy=' + s.dy + ', w=' + s.w);
                }
            }
            if (s.isCircle) {
                if (ch === 'ㅇ') {
                    const fillW = s.w / bw, fillH = s.h / bh;
                    if (fillW < 0.44 || fillH < 0.72) {
                        issues.push('CIRCLE_UNDERFILL s' + s.si + ': w=' + s.w + ' (' + (fillW * 100).toFixed(0) + '% bw), h=' + s.h + ' (' + (fillH * 100).toFixed(0) + '% bh)');
                    }
                }
                if (ch === 'ㅎ') {
                    const fillH = s.h / bh;
                    if (fillH < 0.48) {
                        issues.push('H_CIRCLE_SMALL s' + s.si + ': w=' + s.w + ', h=' + s.h + ' (' + (fillH * 100).toFixed(0) + '% bh)');
                    }
                }
            }
        });

        for (let i = 0; i < stStats.length; i++) {
            for (let j = i + 1; j < stStats.length; j++) {
                const A = stStats[i], B = stStats[j];
                const xOverlap = Math.min(A.maxX, B.maxX) - Math.max(A.minX, B.minX);
                if (A.isPureHoriz && B.isPureHoriz && xOverlap > 20) {
                    const yGap = Math.abs(A.meanY - B.meanY);
                    const pct = (yGap / bh) * 100;
                    if (pct < 12.0) {
                        issues.push('HORIZ_CROWDING s' + i + '&s' + j + ': yGap=' + yGap.toFixed(0) + ' (' + pct.toFixed(1) + '% of bh=' + bh + ')');
                    }
                }
                if ((A.isPureHoriz && B.isCircle) || (A.isCircle && B.isPureHoriz)) {
                    const H = A.isPureHoriz ? A : B;
                    const C = A.isCircle ? A : B;
                    const xOv = Math.min(H.maxX, C.maxX) - Math.max(H.minX, C.minX);
                    if (xOv > 20) {
                        const yGap = H.minY - C.maxY;
                        const pct = (yGap / bh) * 100;
                        if (pct < 12.0) {
                            issues.push('HORIZ_CIRCLE_CROWDING s' + H.si + '&s' + C.si + ': yGap=' + yGap.toFixed(0) + ' (' + pct.toFixed(1) + '% of bh=' + bh + ', H.minY=' + H.minY + ', C.maxY=' + C.maxY + ')');
                        }
                    }
                }
            }
        }

        if (['ㅓ', 'ㅕ'].includes(ch)) {
            const last = m.length - 1;
            for (let si = 0; si < last; si++) {
                const d = distToStroke(m[si][m[si].length - 1], m[last]);
                if (d > 25) issues.push('DISCONNECTED_TICK s' + si + '->s' + last + ': gap=' + d.toFixed(1));
            }
        }
        if (['ㅐ', 'ㅒ'].includes(ch)) {
            const last = m.length - 1;
            for (let si = 1; si < last; si++) {
                const dL = distToStroke(m[si][0], m[0]);
                const dR = distToStroke(m[si][m[si].length - 1], m[last]);
                if (dL > 25 || dR > 25) issues.push('DISCONNECTED_BRIDGE s' + si + ': dLeft=' + dL.toFixed(1) + ', dRight=' + dR.toFixed(1));
            }
        }
        if (ch === 'ㅜ') {
            const barMidX = (stStats[0].minX + stStats[0].maxX) / 2;
            const stemX = stStats[1].meanX;
            if (Math.abs(stemX - barMidX) > 40) {
                issues.push('OFF_CENTER_STEM: stemX=' + stemX.toFixed(0) + ' vs barMidX=' + barMidX.toFixed(0));
            }
        }
        if (ch === 'ㅄ') {
            [2, 3].forEach(si => {
                const dL = distToStroke(m[si][0], m[0]);
                const dR = distToStroke(m[si][m[si].length - 1], m[1]);
                if (dL > 25 || dR > 25) issues.push('MALFORMED_BIEUP_BAR s' + si + ': dLeft=' + dL.toFixed(1) + ', dRight=' + dR.toFixed(1));
            });
            const d5 = distToStroke(m[5][0], m[4]);
            if (d5 > 25) issues.push('DISCONNECTED_SIOT_LEG s5->s4: gap=' + d5.toFixed(1));
        }
        if (['ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ'].includes(ch)) {
            if (m[0].length < 4 || stStats[0].dy > -40) {
                issues.push('MALFORMED_RIEUL_S0: len=' + m[0].length + ', dy=' + stStats[0].dy);
            }
            if (Math.abs(stStats[1].dy) > 30) {
                issues.push('MALFORMED_RIEUL_S1 (not horizontal): dy=' + stStats[1].dy);
            }
            const d21 = Math.hypot(m[2][0][0] - m[1][0][0], m[2][0][1] - m[1][0][1]);
            if (d21 > 45) {
                issues.push('DISCONNECTED_RIEUL_S2: dist(s2[0], s1[0])=' + d21.toFixed(1));
            }
            if (ch === 'ㄾ' && m[5][0][1] < m[3][0][1] - 40) {
                issues.push('MALFORMED_TIEUT_S5: starts at y=' + m[5][0][1] + ' instead of top bar y=' + m[3][0][1]);
            }
            if (ch === 'ㄿ' && (stStats[4].w > 40 || stStats[5].w > 35)) {
                issues.push('ZIGZAG_PIEUP_PILLARS: s4.w=' + stStats[4].w + ', s5.w=' + stStats[5].w);
            }
        }
        if (['ㅈ', 'ㅊ'].includes(ch)) {
            const rIdx = m.length - 1, lIdx = m.length - 2;
            const d = distToStroke(m[rIdx][0], m[lIdx]);
            if (d > 35 || stStats[lIdx].h < bh * 0.28) {
                issues.push('MALFORMED_JIEUT_LEGS: d(s' + rIdx + ',s' + lIdx + ')=' + d.toFixed(1) + ', leftLegH=' + stStats[lIdx].h + ' (bh=' + bh + ')');
            }
        }

        if (issues.length > 0) {
            report.push({ id, ch, b: p.b, issues });
        }
    }
    return report;
}

const replacements = {
    'Cho_T1_ㄸ': {
        b: [130, 395, 380, 250],
        m: [
            [[165, 605], [235, 605], [305, 615]],
            [[195, 600], [208, 510], [220, 420], [275, 425], [330, 435]],
            [[340, 605], [405, 605], [470, 615]],
            [[365, 600], [375, 510], [385, 425], [435, 430], [485, 442]]
        ]
    },
    'Cho_T1_ㅃ': {
        b: [75, 375, 395, 290],
        m: [
            [[95, 589], [130, 560], [150, 460], [159, 400]],
            [[230, 630], [240, 550], [245, 440]],
            [[150, 528], [195, 528], [240, 530]],
            [[159, 432], [202, 432], [245, 435]],
            [[309, 610], [330, 560], [342, 480], [347, 430]],
            [[430, 640], [445, 560], [448, 450]],
            [[342, 535], [390, 535], [440, 537]],
            [[347, 432], [398, 432], [448, 435]]
        ]
    },
    'Cho_T3_ㅇ': {
        b: [100, 520, 430, 370],
        m: [
            makeCircle(315, 710, 140, 140, 28)
        ]
    },
    'Cho_T2_ㅈ': {
        b: [180, 530, 664, 360],
        m: [
            [[351, 828], [528, 840], [735, 835]],
            [[526, 820], [498, 685], [344, 555]],
            [[498, 695], [620, 630], [741, 564]]
        ]
    },
    'Cho_T1_ㅉ': {
        b: [120, 390, 395, 250],
        m: [
            [[155, 600], [230, 602], [305, 608]],
            [[255, 595], [215, 505], [160, 415]],
            [[245, 525], [280, 480], [315, 435]],
            [[335, 605], [405, 608], [475, 615]],
            [[435, 600], [390, 505], [325, 410]],
            [[425, 530], [460, 480], [495, 430]]
        ]
    },
    'Cho_T2_ㅊ': {
        b: [180, 530, 664, 360],
        m: [
            [[465, 865], [535, 850], [605, 845]],
            [[380, 755], [535, 758], [690, 762]],
            [[535, 750], [480, 645], [372, 547]],
            [[515, 680], [605, 625], [695, 570]]
        ]
    },
    'Cho_T1_ㅎ': {
        b: [69, 354, 422, 323],
        m: [
            [[235, 656], [298, 650], [363, 646]],
            [[89, 585], [280, 595], [471, 588]],
            makeCircle(300, 458, 108, 82, 28)
        ]
    },
    'Cho_T2_ㅎ': {
        b: [180, 530, 664, 360],
        m: [
            [[445, 865], [520, 852], [595, 842]],
            [[320, 775], [520, 780], [720, 778]],
            makeCircle(532, 640, 125, 90, 28)
        ]
    },
    'Cho_T3_ㅎ': {
        b: [100, 520, 430, 370],
        m: [
            [[240, 865], [315, 852], [390, 842]],
            [[135, 772], [315, 778], [495, 775]],
            makeCircle(325, 632, 118, 92, 28)
        ]
    },
    'Jung_T2_ㅐ': {
        b: [550, 380, 390, 540],
        m: [
            [[655, 850], [665, 645], [665, 445]],
            [[665, 655], [745, 658], [825, 655]],
            [[820, 885], [828, 650], [822, 420]]
        ]
    },
    'Jung_T1_ㅒ': {
        b: [550, 100, 390, 820],
        m: [
            [[645, 825], [655, 520], [655, 225]],
            [[655, 635], [760, 635], [865, 630]],
            [[655, 445], [760, 445], [865, 440]],
            [[860, 857], [870, 510], [865, 160]]
        ]
    },
    'Jung_T1_ㅓ': {
        b: [550, 100, 390, 820],
        m: [
            [[601, 535], [725, 530], [848, 525]],
            [[803, 857], [852, 510], [846, 164]]
        ]
    },
    'Jung_T1_ㅕ': {
        b: [550, 100, 390, 820],
        m: [
            [[595, 645], [715, 640], [835, 635]],
            [[590, 460], [715, 455], [835, 450]],
            [[797, 887], [842, 510], [826, 146]]
        ]
    },
    'Jung_T1_ㅜ': {
        b: [100, 220, 824, 320],
        m: [
            [[180, 480], [512, 482], [820, 486]],
            [[512, 480], [512, 355], [512, 235]]
        ]
    },
    'Jung_T2_ㅜ': {
        b: [100, 440, 824, 220],
        m: [
            [[180, 585], [512, 588], [820, 592]],
            [[512, 585], [512, 515], [512, 445]]
        ]
    },
    'Jung_T2_ㅝ': {
        b: [160, 380, 780, 540],
        m: [
            [[225, 575], [420, 578], [615, 585]],
            [[395, 572], [395, 495], [395, 420]],
            [[545, 500], [630, 500], [710, 505]],
            [[693, 879], [724, 650], [714, 415]]
        ]
    },
    'Jung_T1_ㅞ': {
        b: [160, 100, 780, 820],
        m: [
            [[220, 495], [400, 498], [577, 505]],
            [[410, 492], [402, 370], [395, 250]],
            [[525, 380], [605, 380], [685, 385]],
            [[685, 810], [690, 511], [690, 210]],
            [[810, 845], [825, 510], [815, 164]]
        ]
    },
    'Jung_T2_ㅞ': {
        b: [160, 380, 780, 540],
        m: [
            [[225, 575], [390, 578], [555, 585]],
            [[390, 572], [390, 495], [390, 420]],
            [[485, 500], [565, 500], [645, 505]],
            [[645, 845], [650, 650], [650, 425]],
            [[745, 880], [755, 650], [750, 415]]
        ]
    },
    'Jong_T2_ㄵ': {
        b: [180, 70, 664, 280],
        m: [
            [[320, 310], [345, 220], [370, 145], [435, 142], [496, 155]],
            [[515, 295], [610, 298], [703, 308]],
            [[625, 292], [580, 195], [488, 95]],
            [[605, 225], [655, 170], [705, 115]]
        ]
    },
    'Jong_T1_ㄶ': {
        b: [160, 80, 700, 360],
        m: [
            [[285, 365], [315, 255], [345, 155], [425, 150], [505, 165]],
            [[555, 415], [615, 405], [675, 395]],
            [[515, 325], [625, 328], [735, 332]],
            makeCircle(635, 192, 80, 82, 28)
        ]
    },
    'Jong_T2_ㄶ': {
        b: [180, 70, 664, 280],
        m: [
            [[325, 295], [350, 215], [375, 135], [440, 132], [505, 145]],
            [[545, 330], [600, 322], [655, 315]],
            [[515, 265], [615, 268], [715, 272]],
            makeCircle(620, 158, 68, 66, 28)
        ]
    },
    'Jong_T2_ㄺ': {
        b: [180, 70, 664, 280],
        m: [
            [[320, 305], [400, 308], [465, 305], [455, 218]],
            [[330, 215], [395, 216], [460, 218]],
            [[335, 210], [355, 160], [375, 115], [445, 115], [510, 128]],
            [[535, 300], [610, 302], [675, 300], [670, 200], [662, 100]]
        ]
    },
    'Jong_T2_ㄻ': {
        b: [180, 70, 664, 280],
        m: [
            [[312, 305], [390, 308], [455, 305], [445, 218]],
            [[325, 215], [390, 216], [455, 218]],
            [[330, 210], [350, 160], [370, 115], [435, 115], [498, 128]],
            [[525, 302], [545, 208], [560, 115]],
            [[535, 302], [615, 305], [690, 302], [685, 208], [680, 115]],
            [[560, 115], [620, 117], [680, 120]]
        ]
    },
    'Jong_T1_ㄼ': {
        b: [160, 80, 700, 360],
        m: [
            [[260, 380], [365, 382], [445, 380], [435, 270]],
            [[270, 265], [355, 268], [440, 270]],
            [[275, 260], [295, 195], [315, 138], [405, 138], [495, 152]],
            [[525, 385], [548, 255], [565, 125]],
            [[710, 400], [705, 260], [695, 125]],
            [[550, 265], [625, 266], [702, 268]],
            [[565, 125], [630, 127], [695, 130]]
        ]
    },
    'Jong_T2_ㄼ': {
        b: [180, 70, 664, 280],
        m: [
            [[315, 305], [395, 308], [460, 305], [450, 218]],
            [[325, 215], [390, 216], [455, 218]],
            [[330, 210], [350, 160], [370, 115], [435, 115], [498, 128]],
            [[525, 305], [545, 208], [560, 110]],
            [[685, 318], [680, 212], [672, 110]],
            [[548, 215], [612, 216], [678, 218]],
            [[560, 110], [616, 112], [672, 115]]
        ]
    },
    'Jong_T1_ㄽ': {
        b: [160, 80, 700, 360],
        m: [
            [[260, 380], [365, 382], [445, 380], [435, 270]],
            [[270, 265], [355, 268], [440, 270]],
            [[275, 260], [295, 195], [315, 138], [405, 138], [495, 152]],
            [[659, 396], [615, 250], [512, 113]],
            [[625, 275], [680, 205], [735, 138]]
        ]
    },
    'Jong_T2_ㄽ': {
        b: [180, 70, 664, 280],
        m: [
            [[315, 305], [395, 308], [460, 305], [450, 218]],
            [[325, 215], [390, 216], [455, 218]],
            [[330, 210], [350, 160], [370, 115], [435, 115], [498, 128]],
            [[647, 325], [605, 205], [513, 95]],
            [[609, 235], [650, 170], [695, 107]]
        ]
    },
    'Jong_T2_ㄾ': {
        b: [180, 70, 664, 280],
        m: [
            [[315, 305], [395, 308], [460, 305], [450, 218]],
            [[325, 215], [390, 216], [455, 218]],
            [[330, 210], [350, 160], [370, 115], [435, 115], [498, 128]],
            [[530, 305], [615, 306], [704, 313]],
            [[540, 215], [620, 216], [705, 224]],
            [[535, 300], [550, 205], [568, 115], [640, 115], [713, 128]]
        ]
    },
    'Jong_T1_ㄿ': {
        b: [160, 80, 700, 360],
        m: [
            [[260, 380], [365, 382], [445, 380], [435, 270]],
            [[270, 265], [355, 268], [440, 270]],
            [[275, 260], [295, 195], [315, 138], [405, 138], [495, 152]],
            [[520, 382], [625, 384], [730, 392]],
            [[575, 375], [580, 255], [585, 135]],
            [[675, 378], [675, 255], [675, 135]],
            [[510, 135], [635, 136], [760, 140]]
        ]
    },
    'Jong_T2_ㄿ': {
        b: [180, 70, 664, 280],
        m: [
            [[315, 305], [395, 308], [460, 305], [450, 218]],
            [[325, 215], [390, 216], [455, 218]],
            [[330, 210], [350, 160], [370, 115], [435, 115], [498, 128]],
            [[525, 305], [605, 306], [690, 314]],
            [[570, 298], [575, 205], [580, 112]],
            [[650, 300], [650, 205], [650, 112]],
            [[515, 112], [610, 113], [705, 116]]
        ]
    },
    'Jong_T1_ㅀ': {
        b: [160, 80, 700, 360],
        m: [
            [[260, 380], [365, 382], [445, 380], [435, 270]],
            [[270, 265], [355, 268], [440, 270]],
            [[275, 260], [295, 195], [315, 138], [405, 138], [495, 152]],
            [[565, 415], [625, 405], [685, 395]],
            [[520, 325], [630, 328], [740, 332]],
            makeCircle(635, 192, 78, 80, 28)
        ]
    },
    'Jong_T2_ㅀ': {
        b: [180, 70, 664, 280],
        m: [
            [[315, 305], [395, 308], [460, 305], [450, 218]],
            [[325, 215], [390, 216], [455, 218]],
            [[330, 210], [350, 160], [370, 115], [435, 115], [498, 128]],
            [[555, 330], [610, 322], [665, 315]],
            [[520, 265], [620, 268], [715, 272]],
            makeCircle(620, 158, 66, 65, 28)
        ]
    },
    'Jong_T1_ㅄ': {
        b: [160, 80, 700, 360],
        m: [
            [[285, 375], [308, 250], [325, 125]],
            [[455, 395], [468, 260], [475, 125]],
            [[310, 260], [390, 262], [468, 265]],
            [[325, 125], [400, 127], [475, 130]],
            [[650, 405], [605, 255], [515, 115]],
            [[612, 265], [680, 195], [750, 130]]
        ]
    },
    'Jong_T2_ㅄ': {
        b: [180, 70, 664, 280],
        m: [
            [[330, 302], [350, 205], [365, 108]],
            [[470, 315], [482, 210], [490, 108]],
            [[350, 212], [416, 214], [482, 216]],
            [[365, 108], [428, 110], [490, 112]],
            [[650, 325], [605, 205], [510, 95]],
            [[612, 220], [660, 165], [710, 110]]
        ]
    },
    'Jong_T1_ㅇ': {
        b: [160, 80, 700, 360],
        m: [
            makeCircle(512, 260, 165, 140, 28)
        ]
    },
    'Jong_T2_ㅇ': {
        b: [180, 70, 664, 280],
        m: [
            makeCircle(512, 210, 150, 112, 28)
        ]
    },
    'Jong_T1_ㅊ': {
        b: [160, 80, 700, 360],
        m: [
            [[465, 415], [525, 405], [585, 395]],
            [[355, 320], [525, 322], [695, 328]],
            [[535, 315], [470, 205], [355, 100]],
            [[520, 255], [615, 185], [710, 115]]
        ]
    },
    'Jong_T2_ㅊ': {
        b: [180, 70, 664, 280],
        m: [
            [[465, 332], [520, 324], [575, 316]],
            [[375, 252], [520, 255], [665, 260]],
            [[530, 248], [470, 170], [365, 95]],
            [[515, 200], [595, 148], [675, 98]]
        ]
    },
    'Jong_T1_ㅎ': {
        b: [160, 80, 700, 360],
        m: [
            [[445, 418], [520, 406], [595, 396]],
            [[320, 330], [512, 334], [700, 338]],
            makeCircle(525, 192, 120, 88, 28)
        ]
    },
    'Jong_T2_ㅎ': {
        b: [180, 70, 664, 280],
        m: [
            [[455, 334], [518, 324], [580, 316]],
            [[355, 265], [515, 268], [675, 272]],
            makeCircle(525, 152, 105, 72, 28)
        ]
    }
};

if (require.main === module) {
    const beforeReport = auditParts(parts);
    console.log('=== BEFORE FIXES: ' + beforeReport.length + ' / ' + Object.keys(parts).length + ' parts flagged ===');
    beforeReport.forEach(r => {
        console.log(' [' + r.id + '] (' + r.ch + ') b=' + JSON.stringify(r.b) + ' -> ' + r.issues.join(' | '));
    });

    const clonedParts = JSON.parse(JSON.stringify(parts));
    for (const [k, rep] of Object.entries(replacements)) {
        if (rep.b) clonedParts[k].b = rep.b;
        if (rep.m) clonedParts[k].m = rep.m;
    }

    const afterReport = auditParts(clonedParts);
    console.log('\n=== AFTER APPLYING ' + Object.keys(replacements).length + ' REPLACEMENTS: ' + afterReport.length + ' / ' + Object.keys(clonedParts).length + ' parts flagged ===');
    afterReport.forEach(r => {
        console.log(' [' + r.id + '] (' + r.ch + ') b=' + JSON.stringify(r.b) + ' -> ' + r.issues.join(' | '));
    });
}

module.exports = { makeCircle, auditParts, replacements };