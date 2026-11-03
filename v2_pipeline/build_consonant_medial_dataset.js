const fs = require('fs');
const engine = require('./medial_axis_engine');

const gungsuh = engine.gungsuh;
// All 14 fundamental Korean consonants (국립국어원 표준 획순 규격 준수)
const consonants = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const dataset = {};

console.log('=== Building 14 Consonants Medial Axis & Voronoi Pipeline ===');

consonants.forEach(ch => {
    console.log(`\nProcessing consonant [${ch}]...`);
    const glyph = gungsuh.glyphForCodePoint(ch.charCodeAt(0));
    const bbox = glyph.bbox;
    const poly = engine.glyphToPolygon(glyph);
    const svgOutline = glyph.path.toSVG();

    console.log(`  BBox: X [${Math.round(bbox.minX)} ~ ${Math.round(bbox.maxX)}], Y [${Math.round(bbox.minY)} ~ ${Math.round(bbox.maxY)}]`);
    const df = engine.computeDistanceField(poly, bbox, 4);
    const strokes = [];

    if (ch === 'ㄱ') {
        // 1 continuous stroke: Horizontal (left to right) -> Corner -> Vertical down
        const horizStart = [bbox.minX + 15, (bbox.maxY + bbox.minY) / 2 + 150];
        const cornerGuide = [bbox.maxX - 40, bbox.maxY - 35];
        const r1 = engine.traceMedialRidge(df, horizStart, cornerGuide, 16, 70);

        const tailGuide = [bbox.maxX - 60, bbox.minY + 15];
        const r2 = engine.traceMedialRidge(df, cornerGuide, tailGuide, 18, 70);

        const allPts = [...r1, ...r2.slice(1)];
        const maxR = Math.max(...allPts.map(p => p[2]));

        strokes.push({
            strokeId: 0,
            name: '자음_ㄱ_1획(상단가로_우측내림)',
            samplePoints: allPts.map(p => [p[0], p[1]]),
            radii: allPts.map(p => p[2]),
            clipWidth: Math.round(maxR * 2.4)
        });
    } else if (ch === 'ㄴ') {
        // 1 continuous stroke: Left vertical down -> Corner -> Bottom horizontal right (to X max)
        const topHead = [bbox.minX + 35, bbox.maxY - 25];
        const cornerGuide = [bbox.minX + 140, bbox.minY + 45];
        const r1 = engine.traceMedialRidge(df, topHead, cornerGuide, 16, 80);

        const bottomTail = [bbox.maxX - 15, bbox.minY + 65];
        const r2 = engine.traceMedialRidge(df, cornerGuide, bottomTail, 18, 80);

        const allPts = [...r1, ...r2.slice(1)];
        const maxR = Math.max(...allPts.map(p => p[2]));

        strokes.push({
            strokeId: 0,
            name: '자음_ㄴ_1획(좌세로_하단가로)',
            samplePoints: allPts.map(p => [p[0], p[1]]),
            radii: allPts.map(p => p[2]),
            clipWidth: Math.round(maxR * 2.4)
        });
    } else if (ch === 'ㄷ') {
        // 2 strokes: Stroke 0 (상단가로: 좌->우), Stroke 1 (좌세로_하단가로: 상->하->우)
        const topStart = [bbox.minX + 20, bbox.maxY - 50];
        const topEnd = [bbox.maxX - 30, bbox.maxY - 45];
        const r0 = engine.traceMedialRidge(df, topStart, topEnd, 16, 65);

        const vertStart = [bbox.minX + 75, (bbox.maxY + bbox.minY) / 2 + 50];
        const cornerGuide = [bbox.minX + 130, bbox.minY + 45];
        const r1_vert = engine.traceMedialRidge(df, vertStart, cornerGuide, 12, 65);

        const bottomTail = [bbox.maxX - 15, bbox.minY + 45];
        const r1_bottom = engine.traceMedialRidge(df, cornerGuide, bottomTail, 16, 75);
        const r1 = [...r1_vert, ...r1_bottom.slice(1)];

        strokes.push({ strokeId: 0, name: '자음_ㄷ_1획(상단가로)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㄷ_2획(좌세로_하단가로)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
    } else if (ch === 'ㄹ') {
        // 3 strokes: 상단ㄱ(좌->우->하) -> 중간가로(좌->우) -> 하단ㄴ(상->하->우)
        // 1. 상단 ㄱ
        const t0_start = [bbox.minX + 25, bbox.maxY - 55];
        const t0_corner = [bbox.maxX - 40, bbox.maxY - 40];
        const t0_horiz = engine.traceMedialRidge(df, t0_start, t0_corner, 14, 65);
        const t0_down = engine.traceMedialRidge(df, t0_corner, [bbox.maxX - 60, (bbox.maxY + bbox.minY) / 2 + 40], 8, 65);
        const r0 = [...t0_horiz, ...t0_down.slice(1)];

        // 2. 중간 가로 (좌 -> 우)
        const m_start = [bbox.minX + 130, (bbox.maxY + bbox.minY) / 2 - 10];
        const m_end = [bbox.maxX - 30, (bbox.maxY + bbox.minY) / 2 - 10];
        const r1 = engine.traceMedialRidge(df, m_start, m_end, 15, 60);

        // 3. 하단 ㄴ (상 -> 하 -> 우)
        const b_start = [bbox.minX + 80, (bbox.maxY + bbox.minY) / 2 - 25];
        const b_corner = [bbox.minX + 140, bbox.minY + 45];
        const b_vert = engine.traceMedialRidge(df, b_start, b_corner, 10, 65);
        const b_tail = [bbox.maxX - 15, bbox.minY + 45];
        const b_bottom = engine.traceMedialRidge(df, b_corner, b_tail, 16, 75);
        const r2 = [...b_vert, ...b_bottom.slice(1)];

        strokes.push({ strokeId: 0, name: '자음_ㄹ_1획(상단ㄱ형)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㄹ_2획(중간가로)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 2, name: '자음_ㄹ_3획(하단ㄴ형)', samplePoints: r2.map(p => [p[0], p[1]]), radii: r2.map(p => p[2]), clipWidth: Math.round(Math.max(...r2.map(p => p[2])) * 2.4) });
    } else if (ch === 'ㅁ') {
        // 3 strokes: 좌세로(상->하) -> 상우꺾임(좌->우->하) -> 하단가로(좌->우)
        const l_start = [bbox.minX + 45, bbox.maxY - 35];
        const l_end = [bbox.minX + 45, bbox.minY + 25];
        const r0 = engine.traceMedialRidge(df, l_start, l_end, 15, 60);

        const t_start = [bbox.minX + 50, bbox.maxY - 35];
        const t_corner = [bbox.maxX - 40, bbox.maxY - 35];
        const t_horiz = engine.traceMedialRidge(df, t_start, t_corner, 14, 60);
        const r_down = engine.traceMedialRidge(df, t_corner, [bbox.maxX - 40, bbox.minY + 25], 14, 60);
        const r1 = [...t_horiz, ...r_down.slice(1)];

        const b_start = [bbox.minX + 35, bbox.minY + 30];
        const b_end = [bbox.maxX - 25, bbox.minY + 30];
        const r2 = engine.traceMedialRidge(df, b_start, b_end, 14, 60);

        strokes.push({ strokeId: 0, name: '자음_ㅁ_1획(좌세로)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㅁ_2획(상우꺾임)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 2, name: '자음_ㅁ_3획(하단가로)', samplePoints: r2.map(p => [p[0], p[1]]), radii: r2.map(p => p[2]), clipWidth: Math.round(Math.max(...r2.map(p => p[2])) * 2.4) });
    } else if (ch === 'ㅂ') {
        // 4 strokes: 좌세로(상->하) -> 우세로(상->하) -> 중간가로(좌->우) -> 하단가로(좌->우)
        const l_start = [bbox.minX + 45, bbox.maxY - 30];
        const l_end = [bbox.minX + 45, bbox.minY + 25];
        const r0 = engine.traceMedialRidge(df, l_start, l_end, 15, 60);

        const r_start = [bbox.maxX - 45, bbox.maxY - 25];
        const r_end = [bbox.maxX - 45, bbox.minY + 25];
        const r1 = engine.traceMedialRidge(df, r_start, r_end, 15, 60);

        const m_start = [bbox.minX + 45, (bbox.maxY + bbox.minY) / 2 + 10];
        const m_end = [bbox.maxX - 45, (bbox.maxY + bbox.minY) / 2 + 10];
        const r2 = engine.traceMedialRidge(df, m_start, m_end, 12, 50);

        const b_start = [bbox.minX + 45, bbox.minY + 30];
        const b_end = [bbox.maxX - 45, bbox.minY + 30];
        const r3 = engine.traceMedialRidge(df, b_start, b_end, 12, 50);

        strokes.push({ strokeId: 0, name: '자음_ㅂ_1획(좌세로)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㅂ_2획(우세로)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 2, name: '자음_ㅂ_3획(중간가로)', samplePoints: r2.map(p => [p[0], p[1]]), radii: r2.map(p => p[2]), clipWidth: Math.round(Math.max(...r2.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 3, name: '자음_ㅂ_4획(하단가로)', samplePoints: r3.map(p => [p[0], p[1]]), radii: r3.map(p => p[2]), clipWidth: Math.round(Math.max(...r3.map(p => p[2])) * 2.4) });
    } else if (ch === 'ㅅ') {
        // 2 strokes: 좌하 삐침(상->좌하) -> 우하 빗침(상->우하)
        const topPt = [(bbox.minX + bbox.maxX) / 2, bbox.maxY - 25];
        const leftTail = [bbox.minX + 20, bbox.minY + 20];
        const r0 = engine.traceMedialRidge(df, topPt, leftTail, 18, 70);

        const midPt = [(bbox.minX + bbox.maxX) / 2 + 10, (bbox.maxY + bbox.minY) / 2 + 20];
        const rightTail = [bbox.maxX - 20, bbox.minY + 20];
        const r1 = engine.traceMedialRidge(df, midPt, rightTail, 15, 70);

        strokes.push({ strokeId: 0, name: '자음_ㅅ_1획(좌하삐침)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㅅ_2획(우하빗침)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
    } else if (ch === 'ㅇ') {
        // 1 closed circle: 12시 방향 시작 반시계 폐곡선 원 (closeDist = 0)
        const cx = (bbox.minX + bbox.maxX) / 2;
        const cy = (bbox.minY + bbox.maxY) / 2;
        const rx = (bbox.maxX - bbox.minX) / 2 - 40;
        const ry = (bbox.maxY - bbox.minY) / 2 - 40;

        const o_pts = [];
        for (let i = 0; i <= 24; i++) {
            const angle = (Math.PI / 2) + (i / 24) * 2 * Math.PI; // 12시 반시계 회전
            const px = cx + rx * Math.cos(angle);
            const py = cy + ry * Math.sin(angle);
            const d = df.getVal(px, py);
            o_pts.push([Math.round(px), Math.round(py), d > 0 ? parseFloat(d.toFixed(1)) : 40]);
        }
        strokes.push({
            strokeId: 0,
            name: '자음_ㅇ_1획(12시반시계타원)',
            samplePoints: o_pts.map(p => [p[0], p[1]]),
            radii: o_pts.map(p => p[2]),
            clipWidth: 160
        });
    } else if (ch === 'ㅈ') {
        // 3 strokes: 상단가로(좌->우) -> 좌하삐침(상->좌하) -> 우하빗침(상->우하)
        const t_start = [bbox.minX + 25, bbox.maxY - 40];
        const t_end = [bbox.maxX - 30, bbox.maxY - 40];
        const r0 = engine.traceMedialRidge(df, t_start, t_end, 15, 60);

        const midTop = [(bbox.minX + bbox.maxX) / 2, bbox.maxY - 45];
        const leftTail = [bbox.minX + 20, bbox.minY + 20];
        const r1 = engine.traceMedialRidge(df, midTop, leftTail, 16, 70);

        const r2_start = [(bbox.minX + bbox.maxX) / 2 + 10, (bbox.maxY + bbox.minY) / 2 + 15];
        const rightTail = [bbox.maxX - 20, bbox.minY + 20];
        const r2 = engine.traceMedialRidge(df, r2_start, rightTail, 14, 70);

        strokes.push({ strokeId: 0, name: '자음_ㅈ_1획(상단가로)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㅈ_2획(좌하삐침)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 2, name: '자음_ㅈ_3획(우하빗침)', samplePoints: r2.map(p => [p[0], p[1]]), radii: r2.map(p => p[2]), clipWidth: Math.round(Math.max(...r2.map(p => p[2])) * 2.4) });
    } else if (ch === 'ㅊ') {
        // 4 strokes: 상단꼭지점 -> 상단가로 -> 좌하삐침 -> 우하빗침
        const dotTop = [(bbox.minX + bbox.maxX) / 2, bbox.maxY - 15];
        const dotBot = [(bbox.minX + bbox.maxX) / 2, bbox.maxY - 55];
        const r0 = engine.traceMedialRidge(df, dotTop, dotBot, 6, 40);

        const t_start = [bbox.minX + 25, bbox.maxY - 85];
        const t_end = [bbox.maxX - 30, bbox.maxY - 85];
        const r1 = engine.traceMedialRidge(df, t_start, t_end, 14, 55);

        const midTop = [(bbox.minX + bbox.maxX) / 2, bbox.maxY - 90];
        const leftTail = [bbox.minX + 20, bbox.minY + 20];
        const r2 = engine.traceMedialRidge(df, midTop, leftTail, 16, 70);

        const r3_start = [(bbox.minX + bbox.maxX) / 2 + 10, (bbox.maxY + bbox.minY) / 2];
        const rightTail = [bbox.maxX - 20, bbox.minY + 20];
        const r3 = engine.traceMedialRidge(df, r3_start, rightTail, 14, 70);

        strokes.push({ strokeId: 0, name: '자음_ㅊ_1획(상단꼭지)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㅊ_2획(상단가로)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 2, name: '자음_ㅊ_3획(좌하삐침)', samplePoints: r2.map(p => [p[0], p[1]]), radii: r2.map(p => p[2]), clipWidth: Math.round(Math.max(...r2.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 3, name: '자음_ㅊ_4획(우하빗침)', samplePoints: r3.map(p => [p[0], p[1]]), radii: r3.map(p => p[2]), clipWidth: Math.round(Math.max(...r3.map(p => p[2])) * 2.4) });
    } else if (ch === 'ㅋ') {
        // 2 strokes: 상단ㄱ -> 가운데가로
        const horizStart = [bbox.minX + 15, bbox.maxY - 40];
        const cornerGuide = [bbox.maxX - 40, bbox.maxY - 40];
        const r0_h = engine.traceMedialRidge(df, horizStart, cornerGuide, 14, 65);
        const tailGuide = [bbox.maxX - 60, bbox.minY + 15];
        const r0_v = engine.traceMedialRidge(df, cornerGuide, tailGuide, 16, 65);
        const r0 = [...r0_h, ...r0_v.slice(1)];

        const m_start = [bbox.minX + 25, (bbox.maxY + bbox.minY) / 2 + 10];
        const m_end = [bbox.maxX - 45, (bbox.maxY + bbox.minY) / 2 + 10];
        const r1 = engine.traceMedialRidge(df, m_start, m_end, 14, 60);

        strokes.push({ strokeId: 0, name: '자음_ㅋ_1획(상단ㄱ형)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㅋ_2획(중간가로)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
    } else if (ch === 'ㅌ') {
        // 3 strokes: 상단가로 -> 중간가로 -> 하단ㄴ형
        const t_start = [bbox.minX + 20, bbox.maxY - 45];
        const t_end = [bbox.maxX - 30, bbox.maxY - 45];
        const r0 = engine.traceMedialRidge(df, t_start, t_end, 15, 60);

        const m_start = [bbox.minX + 30, (bbox.maxY + bbox.minY) / 2 + 15];
        const m_end = [bbox.maxX - 30, (bbox.maxY + bbox.minY) / 2 + 15];
        const r1 = engine.traceMedialRidge(df, m_start, m_end, 14, 60);

        const b_start = [bbox.minX + 60, (bbox.maxY + bbox.minY) / 2 - 10];
        const b_corner = [bbox.minX + 120, bbox.minY + 40];
        const b_vert = engine.traceMedialRidge(df, b_start, b_corner, 10, 65);
        const b_tail = [bbox.maxX - 15, bbox.minY + 40];
        const b_bottom = engine.traceMedialRidge(df, b_corner, b_tail, 16, 75);
        const r2 = [...b_vert, ...b_bottom.slice(1)];

        strokes.push({ strokeId: 0, name: '자음_ㅌ_1획(상단가로)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㅌ_2획(중간가로)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 2, name: '자음_ㅌ_3획(하단ㄴ형)', samplePoints: r2.map(p => [p[0], p[1]]), radii: r2.map(p => p[2]), clipWidth: Math.round(Math.max(...r2.map(p => p[2])) * 2.4) });
    } else if (ch === 'ㅍ') {
        // 4 strokes: 상단가로 -> 좌측세로 -> 우측세로 -> 하단가로
        const t_start = [bbox.minX + 20, bbox.maxY - 40];
        const t_end = [bbox.maxX - 25, bbox.maxY - 40];
        const r0 = engine.traceMedialRidge(df, t_start, t_end, 15, 60);

        const l_start = [bbox.minX + 130, bbox.maxY - 45];
        const l_end = [bbox.minX + 130, bbox.minY + 30];
        const r1 = engine.traceMedialRidge(df, l_start, l_end, 12, 60);

        const r_start = [bbox.maxX - 130, bbox.maxY - 45];
        const r_end = [bbox.maxX - 130, bbox.minY + 30];
        const r2 = engine.traceMedialRidge(df, r_start, r_end, 12, 60);

        const b_start = [bbox.minX + 25, bbox.minY + 35];
        const b_end = [bbox.maxX - 20, bbox.minY + 35];
        const r3 = engine.traceMedialRidge(df, b_start, b_end, 15, 60);

        strokes.push({ strokeId: 0, name: '자음_ㅍ_1획(상단가로)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㅍ_2획(좌세로)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 2, name: '자음_ㅍ_3획(우세로)', samplePoints: r2.map(p => [p[0], p[1]]), radii: r2.map(p => p[2]), clipWidth: Math.round(Math.max(...r2.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 3, name: '자음_ㅍ_4획(하단가로)', samplePoints: r3.map(p => [p[0], p[1]]), radii: r3.map(p => p[2]), clipWidth: Math.round(Math.max(...r3.map(p => p[2])) * 2.4) });
    } else if (ch === 'ㅎ') {
        // 3 strokes: 상단꼭지/가로 -> 중간가로 -> 12시 반시계 원
        const dotTop = [(bbox.minX + bbox.maxX) / 2, bbox.maxY - 15];
        const dotBot = [(bbox.minX + bbox.maxX) / 2, bbox.maxY - 55];
        const r0 = engine.traceMedialRidge(df, dotTop, dotBot, 6, 40);

        const m_start = [bbox.minX + 25, bbox.maxY - 85];
        const m_end = [bbox.maxX - 25, bbox.maxY - 85];
        const r1 = engine.traceMedialRidge(df, m_start, m_end, 15, 60);

        const cx = (bbox.minX + bbox.maxX) / 2;
        const cy = bbox.minY + (bbox.maxY - bbox.minY) * 0.35;
        const rx = (bbox.maxX - bbox.minX) / 2 - 60;
        const ry = (bbox.maxY - bbox.minY) * 0.28;

        const o_pts = [];
        for (let i = 0; i <= 24; i++) {
            const angle = (Math.PI / 2) + (i / 24) * 2 * Math.PI; // 12시 반시계 회전
            const px = cx + rx * Math.cos(angle);
            const py = cy + ry * Math.sin(angle);
            const d = df.getVal(px, py);
            o_pts.push([Math.round(px), Math.round(py), d > 0 ? parseFloat(d.toFixed(1)) : 35]);
        }

        strokes.push({ strokeId: 0, name: '자음_ㅎ_1획(상단꼭지)', samplePoints: r0.map(p => [p[0], p[1]]), radii: r0.map(p => p[2]), clipWidth: Math.round(Math.max(...r0.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 1, name: '자음_ㅎ_2획(중간가로)', samplePoints: r1.map(p => [p[0], p[1]]), radii: r1.map(p => p[2]), clipWidth: Math.round(Math.max(...r1.map(p => p[2])) * 2.4) });
        strokes.push({ strokeId: 2, name: '자음_ㅎ_3획(12시반시계타원)', samplePoints: o_pts.map(p => [p[0], p[1]]), radii: o_pts.map(p => p[2]), clipWidth: 150 });
    }

    // Exact Voronoi Clipping Polygons
    const voronoiPolygons = engine.computeVoronoiClipPolygons(strokes, bbox);
    strokes.forEach((st, idx) => {
        st.voronoiPolygon = voronoiPolygons[idx];
    });

    dataset[ch] = {
        char: ch,
        bbox: { minX: bbox.minX, maxX: bbox.maxX, minY: bbox.minY, maxY: bbox.maxY },
        outline: svgOutline,
        strokes
    };
});

fs.writeFileSync('C:/한글획순/v2_pipeline/consonant_dataset.json', JSON.stringify(dataset, null, 2), 'utf8');
fs.writeFileSync('C:/한글획순/v2_pipeline/consonant_dataset.js', 'window.CONSONANT_MEDIAL_DATASET = ' + JSON.stringify(dataset, null, 2) + ';', 'utf8');
console.log('\n[SUCCESS] Successfully generated all 14 consonants medial & Voronoi dataset!');
