const fs = require('fs');

const rawData = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));
const parts = Object.values(rawData.parts);

const auditIssues = [];

function checkPart(p) {
  const m = p.medians;
  const c = p.char;
  const id = p.id;

  // 1. 점 진행 방향 기본 규칙
  m.forEach((st, sIdx) => {
    if (st.length < 2) {
      auditIssues.push({ id, char: c, issue: `Stroke ${sIdx+1} has < 2 points` });
      return;
    }
    const f = st[0];
    const l = st[st.length - 1];
    const dx = l[0] - f[0];
    const dy = l[1] - f[1];

    // 가로획(수평 획): dx가 절대적으로 커야 하고, 무조건 dx > 0 (좌 -> 우)
    if (Math.abs(dx) > Math.abs(dy) * 2.5 && Math.abs(dx) > 60) {
      if (dx < 0) {
        auditIssues.push({ id, char: c, issue: `Stroke ${sIdx+1} is horizontal but reversed (dx = ${dx})` });
      }
    }

    // 순수 세로획(수직 획): dy가 절대적으로 커야 하고, 무조건 dy < 0 (상 -> 하)
    if (Math.abs(dy) > Math.abs(dx) * 2.5 && Math.abs(dy) > 60) {
      if (dy > 0) {
        auditIssues.push({ id, char: c, issue: `Stroke ${sIdx+1} is vertical but reversed (dy = ${dy})` });
      }
    }
  });

  // 2. 자소별 구조 및 순서
  if (c === 'ㄱ') {
    // 1획: 가로 -> 세로 꺾임. 시작점 x < 끝점 x, 시작점 y > 끝점 y
    if (m.length !== 1) auditIssues.push({ id, char: c, issue: `Expected 1 stroke, got ${m.length}` });
    else {
      const st = m[0];
      if (st[0][0] >= st[st.length-1][0] || st[0][1] <= st[st.length-1][1]) {
        auditIssues.push({ id, char: c, issue: `ㄱ direction abnormal` });
      }
    }
  }

  if (c === 'ㄴ') {
    // 1획: 세로 -> 가로 꺾임. 시작점 x < 끝점 x, 시작점 y > 끝점 y
    if (m.length !== 1) auditIssues.push({ id, char: c, issue: `Expected 1 stroke, got ${m.length}` });
    else {
      const st = m[0];
      if (st[0][0] >= st[st.length-1][0] || st[0][1] <= st[st.length-1][1]) {
        auditIssues.push({ id, char: c, issue: `ㄴ direction abnormal` });
      }
    }
  }

  if (c === 'ㄷ') {
    // 2획: 1획 상단 가로, 2획 ㄴ형
    if (m.length !== 2) auditIssues.push({ id, char: c, issue: `Expected 2 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1];
      if (s0[0][1] < s1[0][1]) {
        auditIssues.push({ id, char: c, issue: `ㄷ 1st stroke y (${s0[0][1]}) < 2nd stroke y (${s1[0][1]})` });
      }
    }
  }

  if (c === 'ㄹ') {
    // 3획: 1획 ㄱ, 2획 중가로, 3획 ㄴ
    if (m.length !== 3) auditIssues.push({ id, char: c, issue: `Expected 3 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1], s2 = m[2];
      const y0 = s0[0][1], y1 = s1[0][1], y2 = s2[0][1];
      if (!(y0 > y1 && y1 > y2)) {
        auditIssues.push({ id, char: c, issue: `ㄹ stroke order y out of order: y0=${y0}, y1=${y1}, y2=${y2}` });
      }
    }
  }

  if (c === 'ㅁ') {
    // 3획: 1획 좌세로, 2획 ㄱ, 3획 하단가로
    if (m.length !== 3) auditIssues.push({ id, char: c, issue: `Expected 3 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1], s2 = m[2];
      // s0은 좌세로, s1은 ㄱ, s2는 하가로
      const x0 = s0[0][0], x1 = s1[0][0];
      const y1 = s1[0][1], y2 = s2[0][1];
      if (x0 > x1 + 10) auditIssues.push({ id, char: c, issue: `ㅁ 1st stroke not left of 2nd: x0=${x0}, x1=${x1}` });
      if (y1 < y2) auditIssues.push({ id, char: c, issue: `ㅁ 2nd stroke y (${y1}) < 3rd stroke y (${y2})` });
    }
  }

  if (c === 'ㅂ') {
    // 4획: 1획 좌세로, 2획 우세로, 3획 중가로, 4획 하가로
    if (m.length !== 4) auditIssues.push({ id, char: c, issue: `Expected 4 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1], s2 = m[2], s3 = m[3];
      const x0 = s0[0][0], x1 = s1[0][0];
      const y2 = s2[0][1], y3 = s3[0][1];
      if (x0 >= x1) auditIssues.push({ id, char: c, issue: `ㅂ pillars swapped: x0=${x0}, x1=${x1}` });
      if (y2 <= y3) auditIssues.push({ id, char: c, issue: `ㅂ bars swapped: y2=${y2}, y3=${y3}` });
    }
  }

  if (c === 'ㅅ') {
    // 2획: 1획 좌삐침, 2획 우파임
    if (m.length !== 2) auditIssues.push({ id, char: c, issue: `Expected 2 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1];
      const end0_x = s0[s0.length-1][0];
      const end1_x = s1[s1.length-1][0];
      if (end0_x >= end1_x) auditIssues.push({ id, char: c, issue: `ㅅ strokes swapped: end0_x=${end0_x}, end1_x=${end1_x}` });
    }
  }

  if (c === 'ㅇ') {
    // 1획 원: 17개 점, 12시 시작, 폐곡선 dist == 0
    if (m.length !== 1) auditIssues.push({ id, char: c, issue: `Expected 1 stroke, got ${m.length}` });
    else {
      const st = m[0];
      const f = st[0], l = st[st.length-1];
      const d = Math.hypot(f[0]-l[0], f[1]-l[1]);
      if (d > 1) auditIssues.push({ id, char: c, issue: `ㅇ not closed: gap=${d}` });
    }
  }

  if (c === 'ㅈ') {
    // 3획: 1획 가로, 2획 좌삐침, 3획 우파임
    if (m.length !== 3) auditIssues.push({ id, char: c, issue: `Expected 3 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1], s2 = m[2];
      const end1_x = s1[s1.length-1][0];
      const end2_x = s2[s2.length-1][0];
      if (end1_x >= end2_x) auditIssues.push({ id, char: c, issue: `ㅈ legs swapped: end1_x=${end1_x}, end2_x=${end2_x}` });
    }
  }

  if (c === 'ㅊ') {
    // 4획: 1획 점, 2획 가로, 3획 좌삐침, 4획 우파임
    if (m.length !== 4) auditIssues.push({ id, char: c, issue: `Expected 4 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1], s2 = m[2], s3 = m[3];
      if (s0[0][1] <= s1[0][1]) auditIssues.push({ id, char: c, issue: `ㅊ top bar order inverted: y0=${s0[0][1]}, y1=${s1[0][1]}` });
      const end2_x = s2[s2.length-1][0];
      const end3_x = s3[s3.length-1][0];
      if (end2_x >= end3_x) auditIssues.push({ id, char: c, issue: `ㅊ legs swapped: end2_x=${end2_x}, end3_x=${end3_x}` });
    }
  }

  if (c === 'ㅋ') {
    // 2획: 1획 ㄱ, 2획 중간가로
    if (m.length !== 2) auditIssues.push({ id, char: c, issue: `Expected 2 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1];
      if (s0[0][1] <= s1[0][1]) auditIssues.push({ id, char: c, issue: `ㅋ strokes inverted: y0=${s0[0][1]}, y1=${s1[0][1]}` });
    }
  }

  if (c === 'ㅌ') {
    // 3획: 1획 상가로, 2획 중가로, 3획 ㄴ
    if (m.length !== 3) auditIssues.push({ id, char: c, issue: `Expected 3 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1], s2 = m[2];
      if (s0[0][1] <= s1[0][1]) auditIssues.push({ id, char: c, issue: `ㅌ top bars inverted: y0=${s0[0][1]}, y1=${s1[0][1]}` });
    }
  }

  if (c === 'ㅍ') {
    // 4획: 1획 상가로, 2획 좌세로, 3획 우세로, 4획 하가로
    if (m.length !== 4) auditIssues.push({ id, char: c, issue: `Expected 4 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1], s2 = m[2], s3 = m[3];
      if (s0[0][1] <= s3[0][1]) auditIssues.push({ id, char: c, issue: `ㅍ horizontals inverted: y0=${s0[0][1]}, y3=${s3[0][1]}` });
      if (s1[0][0] >= s2[0][0]) auditIssues.push({ id, char: c, issue: `ㅍ pillars swapped: x1=${s1[0][0]}, x2=${s2[0][0]}` });
    }
  }

  if (c === 'ㅎ') {
    // 3획: 1획 상점, 2획 가로, 3획 원
    if (m.length !== 3) auditIssues.push({ id, char: c, issue: `Expected 3 strokes, got ${m.length}` });
    else {
      const s0 = m[0], s1 = m[1], s2 = m[2];
      if (s0[0][1] <= s1[0][1]) auditIssues.push({ id, char: c, issue: `ㅎ top bars inverted: y0=${s0[0][1]}, y1=${s1[0][1]}` });
      const f = s2[0], l = s2[s2.length-1];
      const d = Math.hypot(f[0]-l[0], f[1]-l[1]);
      if (d > 1) auditIssues.push({ id, char: c, issue: `ㅎ circle not closed: gap=${d}` });
    }
  }

  // 모음 검사:
  // ㅓ: 1획 가지 -> 2획 세로기둥
  if (c === 'ㅓ') {
    if (m.length === 2) {
      const s0 = m[0], s1 = m[1];
      const s0_dx = Math.abs(s0[s0.length-1][0] - s0[0][0]);
      const s1_dy = Math.abs(s1[s1.length-1][1] - s1[0][1]);
      if (s0_dx < 50 || s1_dy < 200) {
        auditIssues.push({ id, char: c, issue: `ㅓ stroke pattern abnormal` });
      }
    }
  }

  // ㅗ: 1획 세로가지 -> 2획 가로받침
  if (c === 'ㅗ') {
    if (m.length === 2) {
      const s0 = m[0], s1 = m[1];
      const s0_dy = Math.abs(s0[s0.length-1][1] - s0[0][1]);
      const s1_dx = Math.abs(s1[s1.length-1][0] - s1[0][0]);
      if (s0_dy < 50 || s1_dx < 200) {
        auditIssues.push({ id, char: c, issue: `ㅗ stroke pattern abnormal` });
      }
    }
  }

  // ㅜ: 1획 가로받침 -> 2획 세로가지
  if (c === 'ㅜ') {
    if (m.length === 2) {
      const s0 = m[0], s1 = m[1];
      const s0_dx = Math.abs(s0[s0.length-1][0] - s0[0][0]);
      const s1_dy = Math.abs(s1[s1.length-1][1] - s1[0][1]);
      if (s0_dx < 200 || s1_dy < 50) {
        auditIssues.push({ id, char: c, issue: `ㅜ stroke pattern abnormal` });
      }
    }
  }
}

parts.forEach(p => checkPart(p));

console.log('=== Deep Stroke Order & Direction Audit ===');
console.log('Total issues found:', auditIssues.length);
auditIssues.forEach(iss => console.log(JSON.stringify(iss)));
