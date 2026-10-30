const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));
const parts = Object.values(rawData.parts);

console.log('Total parts in warehouse:', parts.length);

const issues = [];

parts.forEach(p => {
  const m = p.medians || [];
  if (m.length === 0) {
    issues.push({ id: p.id, char: p.char, type: 'NO_MEDIANS' });
    return;
  }

  // 1. 점 개수 최소 2개 이상
  m.forEach((stroke, sIdx) => {
    if (stroke.length < 2) {
      issues.push({ id: p.id, char: p.char, type: 'TOO_FEW_POINTS', stroke: sIdx, count: stroke.length });
    }
  });

  const c = p.char;

  // 2. 가로획 좌->우 방향 검증 (명확한 수평 획)
  m.forEach((stroke, sIdx) => {
    const f = stroke[0];
    const l = stroke[stroke.length - 1];
    const dx = l[0] - f[0];
    const dy = l[1] - f[1];
    // 순수 가로획인 경우: |dx| > 2 * |dy|
    if (Math.abs(dx) > 2 * Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < -30) {
        issues.push({ id: p.id, char: c, type: 'HORIZONTAL_REVERSED', stroke: sIdx, dx, dy });
      }
    }
    // 순수 세로획인 경우: |dy| > 2 * |dx|
    // HanziWriter 좌표계: 위가 큰 y, 아래가 작은 y -> 상에서 하로 내려가면 dy < 0
    if (Math.abs(dy) > 2 * Math.abs(dx) && Math.abs(dy) > 50) {
      if (dy > 30) {
        issues.push({ id: p.id, char: c, type: 'VERTICAL_REVERSED', stroke: sIdx, dx, dy });
      }
    }
  });

  // 3. 국립국어원 표준 한글 필순 검사
  // ㅓ: 1획 짧은 가로가지(좌->우) -> 2획 긴 세로기둥(상->하)
  if (c === 'ㅓ') {
    if (m.length === 2) {
      const s0_dx = Math.abs(m[0][m[0].length-1][0] - m[0][0][0]);
      const s0_dy = Math.abs(m[0][m[0].length-1][1] - m[0][0][1]);
      const s1_dx = Math.abs(m[1][m[1].length-1][0] - m[1][0][0]);
      const s1_dy = Math.abs(m[1][m[1].length-1][1] - m[1][0][1]);
      // 만약 s0이 세로기둥이고 s1이 가지라면?
      if (s0_dy > s0_dx * 2 && s1_dx > s1_dy) {
        issues.push({ id: p.id, char: c, type: 'EO_STROKE_ORDER_SWAPPED' });
      }
    }
  }

  // ㅕ: 1획 상단가지 -> 2획 하단가지 -> 3획 세로기둥
  if (c === 'ㅕ') {
    if (m.length === 3) {
      const s2_dy = Math.abs(m[2][m[2].length-1][1] - m[2][0][1]);
      const s0_dy = Math.abs(m[0][m[0].length-1][1] - m[0][0][1]);
      if (s0_dy > 300) { // s0이 세로기둥인 경우
        issues.push({ id: p.id, char: c, type: 'YEO_STROKE_ORDER_SWAPPED' });
      }
    }
  }

  // ㅔ: ㅓ(1, 2) + ㅣ(3) 또는 가지->좌기둥->우기둥
  // ㅖ: ㅕ(1, 2, 3) + ㅣ(4)
  // ㅗ: 1획 세로가지(상->하) -> 2획 가로받침(좌->우)
  if (c === 'ㅗ') {
    if (m.length === 2) {
      const s0_dy = Math.abs(m[0][m[0].length-1][1] - m[0][0][1]);
      const s0_dx = Math.abs(m[0][m[0].length-1][0] - m[0][0][0]);
      const s1_dx = Math.abs(m[1][m[1].length-1][0] - m[1][0][0]);
      const s1_dy = Math.abs(m[1][m[1].length-1][1] - m[1][0][1]);
      // s0이 가로받침이고 s1이 세로가지라면 바뀜!
      if (s0_dx > s0_dy * 2 && s1_dy > s1_dx * 1.5) {
        issues.push({ id: p.id, char: c, type: 'O_STROKE_ORDER_SWAPPED' });
      }
    }
  }

  // ㅜ: 1획 가로받침(좌->우) -> 2획 세로가지(상->하)
  if (c === 'ㅜ') {
    if (m.length === 2) {
      const s0_dy = Math.abs(m[0][m[0].length-1][1] - m[0][0][1]);
      const s0_dx = Math.abs(m[0][m[0].length-1][0] - m[0][0][0]);
      const s1_dx = Math.abs(m[1][m[1].length-1][0] - m[1][0][0]);
      const s1_dy = Math.abs(m[1][m[1].length-1][1] - m[1][0][1]);
      if (s0_dy > s0_dx * 2 && s1_dx > s1_dy * 1.5) {
        issues.push({ id: p.id, char: c, type: 'U_STROKE_ORDER_SWAPPED' });
      }
    }
  }

  // ㅛ: 1획 좌세로 -> 2획 우세로 -> 3획 가로받침
  if (c === 'ㅛ') {
    if (m.length === 3) {
      const s2_dx = Math.abs(m[2][m[2].length-1][0] - m[2][0][0]);
      const s0_dx = Math.abs(m[0][m[0].length-1][0] - m[0][0][0]);
      if (s0_dx > 300) { // 1획이 가로받침인 경우
        issues.push({ id: p.id, char: c, type: 'YO_STROKE_ORDER_SWAPPED' });
      }
    }
  }

  // ㅠ: 1획 가로받침 -> 2획 좌세로 -> 3획 우세로
  if (c === 'ㅠ') {
    if (m.length === 3) {
      const s0_dx = Math.abs(m[0][m[0].length-1][0] - m[0][0][0]);
      const s0_dy = Math.abs(m[0][m[0].length-1][1] - m[0][0][1]);
      if (s0_dy > s0_dx * 2) { // 1획이 세로인 경우
        issues.push({ id: p.id, char: c, type: 'YU_STROKE_ORDER_SWAPPED' });
      }
    }
  }

  // ㅂ: 1획 좌세로, 2획 우세로, 3획 중가로, 4획 하가로
  if (c === 'ㅂ') {
    if (m.length === 4) {
      const x1 = m[0][0][0];
      const x2 = m[1][0][0];
      if (x1 > x2) issues.push({ id: p.id, char: c, type: 'BIEUP_PILLARS_SWAPPED' });
      const y3 = m[2][0][1];
      const y4 = m[3][0][1];
      if (y3 < y4) issues.push({ id: p.id, char: c, type: 'BIEUP_BARS_SWAPPED' });
    }
  }

  // ㅍ: 1획 상가로, 2획 좌세로, 3획 우세로, 4획 하가로
  if (c === 'ㅍ') {
    if (m.length === 4) {
      const y1 = m[0][0][1];
      const y4 = m[3][0][1];
      if (y1 < y4) issues.push({ id: p.id, char: c, type: 'PIEUP_BARS_SWAPPED' });
      const x2 = m[1][0][0];
      const x3 = m[2][0][0];
      if (x2 > x3) issues.push({ id: p.id, char: c, type: 'PIEUP_PILLARS_SWAPPED' });
    }
  }

  // ㄹ: 3획
  // 1획 ㄱ (가로->우세로 꺾임), 2획 가로, 3획 ㄴ (좌세로->가로 꺾임)
  if (c === 'ㄹ') {
    if (m.length !== 3) {
      issues.push({ id: p.id, char: c, type: 'RIEUL_STROKE_COUNT', count: m.length });
    } else {
      const y0 = m[0][0][1];
      const y1 = m[1][0][1];
      const y2 = m[2][0][1];
      if (y0 < y1 || y1 < y2) {
        issues.push({ id: p.id, char: c, type: 'RIEUL_STROKES_ORDER_ERROR', y0, y1, y2 });
      }
    }
  }

  // ㄷ: 2획
  // 1획 가로 (상단), 2획 ㄴ (세로->가로)
  if (c === 'ㄷ') {
    if (m.length !== 2) {
      issues.push({ id: p.id, char: c, type: 'DIGEUT_STROKE_COUNT', count: m.length });
    } else {
      const y0 = m[0][0][1];
      const y1 = m[1][0][1];
      if (y0 < y1) {
        issues.push({ id: p.id, char: c, type: 'DIGEUT_STROKES_ORDER_ERROR', y0, y1 });
      }
    }
  }

  // ㅌ: 3획
  // 1획 상가로, 2획 중가로, 3획 ㄴ
  if (c === 'ㅌ') {
    if (m.length !== 3) {
      issues.push({ id: p.id, char: c, type: 'TIEUT_STROKE_COUNT', count: m.length });
    } else {
      const y0 = m[0][0][1];
      const y1 = m[1][0][1];
      const y2 = m[2][0][1];
      if (y0 < y1 || y1 < y2 - 40) {
        issues.push({ id: p.id, char: c, type: 'TIEUT_STROKES_ORDER_ERROR', y0, y1, y2 });
      }
    }
  }

  // ㅅ: 2획
  // 1획 삐침 (좌하향), 2획 파임 (우하향)
  if (c === 'ㅅ') {
    if (m.length !== 2) {
      issues.push({ id: p.id, char: c, type: 'SIOT_STROKE_COUNT', count: m.length });
    } else {
      const end0_x = m[0][m[0].length - 1][0];
      const end1_x = m[1][m[1].length - 1][0];
      if (end0_x > end1_x) {
        issues.push({ id: p.id, char: c, type: 'SIOT_STROKES_SWAPPED', end0_x, end1_x });
      }
    }
  }

  // ㅈ: 3획 (1획 가로, 2획 좌삐침, 3획 우파임)
  if (c === 'ㅈ') {
    if (m.length === 3) {
      const end1_x = m[1][m[1].length - 1][0];
      const end2_x = m[2][m[2].length - 1][0];
      if (end1_x > end2_x) {
        issues.push({ id: p.id, char: c, type: 'JIEUT_STROKES_SWAPPED', end1_x, end2_x });
      }
    }
  }

  // ㅊ: 4획 (1획 상점/가로, 2획 가로, 3획 좌삐침, 4획 우파임)
  if (c === 'ㅊ') {
    if (m.length === 4) {
      const y0 = m[0][0][1];
      const y1 = m[1][0][1];
      if (y0 < y1) {
        issues.push({ id: p.id, char: c, type: 'CHIEUT_TOP_BARS_SWAPPED', y0, y1 });
      }
      const end2_x = m[2][m[2].length - 1][0];
      const end3_x = m[3][m[3].length - 1][0];
      if (end2_x > end3_x) {
        issues.push({ id: p.id, char: c, type: 'CHIEUT_PIED_SWAPPED', end2_x, end3_x });
      }
    }
  }
});

console.log('=== Stroke Order Analysis Results ===');
console.log('Total issues found:', issues.length);
issues.forEach(iss => console.log(JSON.stringify(iss)));
