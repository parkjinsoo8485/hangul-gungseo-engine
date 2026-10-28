const fs = require('fs');
global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;
const issues = [];

// 표준 한글 획순 (국립국어원 기준)
// HanziWriter 좌표계: x=0 left, x=1024 right, y=0 bottom, y=900 top (y 역방향)
// 화면 기준: x 우방향, y 아래방향 (화면_y = 900 - hw_y)

function analyzeHWStroke(st) {
    const start = st[0];
    const end = st[st.length - 1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1]; // HW에서 dy > 0 = 위로(화면에서 올라감), dy < 0 = 아래로(화면에서 내려감)
    const length = Math.hypot(dx, dy);
    
    // 폐곡선 판별: 점 수가 많고, 전체 종단 간격이 획 평균 간격보다 작아야 함
    let totalLen = 0;
    for (let i = 1; i < st.length; i++) {
        totalLen += Math.hypot(st[i][0] - st[i-1][0], st[i][1] - st[i-1][1]);
    }
    const avgStep = st.length > 1 ? totalLen / (st.length - 1) : 1;
    const closeDist = Math.hypot(dx, dy);
    const isClosed = st.length > 8 && closeDist < Math.max(avgStep * 4, 40);
    
    const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
    const isVertical = Math.abs(dy) > Math.abs(dx) * 1.5;
    
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    st.forEach(([x, y]) => {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
    });

    return { start, end, dx, dy, length, totalLen, avgStep, isClosed, isHorizontal, isVertical, minX, maxX, minY, maxY };
}

for (const [id, p] of Object.entries(parts)) {
    const { c: char, r: role, t: type, m: strokes } = p;
    const analysis = strokes.map(analyzeHWStroke);

    strokes.forEach((st, idx) => {
        const a = analysis[idx];
        
        if (a.isClosed) return; // 폐곡선은 방향 검사 제외 (ㅇ, ㅎ 원)
        
        // 수평 획: 오른쪽으로 진행 (dx > 0)
        // 임계값을 -80으로 강화 (일부 획은 약간 왼쪽으로 끝날 수 있음)
        if (a.isHorizontal && a.dx < -80) {
            issues.push(`[WH] ${id} stroke ${idx}: 수평 획 반대방향(R->L) dx=${a.dx.toFixed(0)}`);
        }
        
        // 수직 획: 위에서 아래로 (HW에서 dy < 0이어야 함, 화면에서 아래 = HW에서 y 감소)
        // dy > 80이면 아래→위 방향
        if (a.isVertical && a.dy > 80) {
            issues.push(`[WH] ${id} stroke ${idx}: 수직 획 반대방향(B->T) dy=${a.dy.toFixed(0)}`);
        }
    });

    // 자음별 획순 심층 검증
    if (char === 'ㅂ' && strokes.length === 4) {
        const [a0, a1, a2, a3] = analysis;
        // 두 세로획 (0,1)이 가로획 (2,3)보다 위에 있어야 함
        // 세로획 시작점이 가로획 시작점보다 높아야 함 (HW y값이 더 커야 함)
        const vertAvgY = (a0.start[1] + a1.start[1]) / 2;
        const horizAvgY = (a2.start[1] + a3.start[1]) / 2;
        if (vertAvgY < horizAvgY) {
            issues.push(`[WH] ${id}: ㅂ 세로획이 가로획보다 아래에 있음! 획순 오류 가능`);
        }
        // 첫 세로획이 두 번째 세로획보다 왼쪽에 있어야
        if (a0.start[0] > a1.start[0] + 30) {
            issues.push(`[WH] ${id}: ㅂ 왼쪽 세로획이 오른쪽 세로획보다 우측에 있음!`);
        }
    }
    
    if (char === 'ㅍ' && strokes.length === 4) {
        const [a0, a1, a2, a3] = analysis;
        // 0: 위 가로획, 1: 왼 세로획, 2: 오른 세로획, 3: 아래 가로획
        if (!a0.isHorizontal) issues.push(`[WH] ${id}: ㅍ 1획이 수평이 아님`);
        if (!a3.isHorizontal) issues.push(`[WH] ${id}: ㅍ 4획이 수평이 아님`);
        // 위 가로획이 아래 가로획보다 높아야
        if (a0.start[1] < a3.start[1]) issues.push(`[WH] ${id}: ㅍ 위 가로획이 아래 가로획보다 낮음!`);
    }

    if (char === 'ㅌ' && strokes.length === 3) {
        const [a0, a1, a2] = analysis;
        // 0: 위 가로획, 1: 중간 가로획, 2: 아래 ㄴ
        const maxY0 = a0.maxY;
        const startY1 = a1.start[1];
        if (maxY0 < startY1 - 20) {
            // 0획 전체가 1획 시작보다 낮음 -> 획순 이상
            issues.push(`[WH] ${id}: ㅌ 1획이 2획보다 낮음! (y0_max=${maxY0}, y1_start=${startY1})`);
        }
    }

    if (char === 'ㅎ' && strokes.length === 3) {
        const [a0, a1, a2] = analysis;
        // 0: 짧은 방점, 1: 가로획, 2: ㅇ 원
        if (a0.maxY < a1.start[1] - 30) {
            issues.push(`[WH] ${id}: ㅎ 방점이 가로획보다 낮음!`);
        }
    }

    if (char === 'ㅈ' || char === 'ㅊ') {
        // ㅈ: 가로획 → 왼쪽 빗금 → 오른쪽 빗금
        // 첫 획이 가장 위에 있어야
        if (strokes.length >= 2) {
            const tops = analysis.map(a => a.maxY);
            const topStroke = tops.indexOf(Math.max(...tops));
            if (topStroke !== 0) {
                issues.push(`[WH] ${id}: ${char} 첫 획이 가장 위에 있지 않음! (최고 y획순: ${topStroke}번)`);
            }
        }
    }
}

console.log('=== 창고 정밀 획순 검사 결과 ===');
console.log('총 문제 수:', issues.length);
issues.forEach(iss => console.log(' - ' + iss));
if (issues.length === 0) {
    console.log('✅ 모든 창고 자소 획순 검사 통과!');
}
