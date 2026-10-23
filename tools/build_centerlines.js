/**
 * 궁서체 중심선 수집기(view_150_warehouse_gallery.html)의 창고 JSON에서
 * 중심선(medians)·box·획 두께만 추출해 엔진용 경량 데이터(warehouse_centerlines.js)로 변환하고,
 * 모든 자소를 검증(하네스)한다.
 *
 *   node tools/build_centerlines.js            1회 빌드 + 검증
 *   node tools/build_centerlines.js --watch    창고 JSON 변경을 감시하며 무한 루프로 재빌드·재검증
 *   node tools/build_centerlines.js --src <json 경로>
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_SRC = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const OUT = path.join(__dirname, '..', 'warehouse_centerlines.js');

const args = process.argv.slice(2);
const srcIdx = args.indexOf('--src');
const SRC = srcIdx >= 0 ? args[srcIdx + 1] : DEFAULT_SRC;
const WATCH = args.includes('--watch');

/** 검증: 각 중심선이 box 안에 있는지, 점 수/획 수가 정상인지, 점이 중복·역행하지 않는지 */
function validate(parts) {
    const problems = [];
    for (const [id, p] of Object.entries(parts)) {
        const [bx, by, bw, bh] = p.b;
        if (!(bw > 0 && bh > 0)) problems.push(`${id}: box 크기 이상`);
        if (!p.m.length) problems.push(`${id}: 획 없음`);
        p.m.forEach((st, si) => {
            if (st.length < 2) problems.push(`${id} ${si + 1}획: 점 ${st.length}개`);
            st.forEach(([x, y], pi) => {
                const tol = 12;
                if (x < bx - tol || x > bx + bw + tol || y < by - tol || y > by + bh + tol) {
                    problems.push(`${id} ${si + 1}획 ${pi + 1}번점 [${x},${y}] box 이탈`);
                }
                if (pi > 0 && x === st[pi - 1][0] && y === st[pi - 1][1]) {
                    problems.push(`${id} ${si + 1}획 ${pi + 1}번점 중복점`);
                }
            });
        });
    }
    return problems;
}

function build() {
    const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
    const parts = {};
    for (const [id, p] of Object.entries(raw.parts)) {
        parts[id] = {
            c: p.char, r: p.role, t: p.formType,
            b: [p.box.x, p.box.y, p.box.w, p.box.h],
            m: p.medians,
            w: p.strokeWidths || []
        };
    }
    const problems = validate(parts);
    const body = JSON.stringify({ version: raw.meta && raw.meta.calibrationVersion, updatedAt: raw.meta && raw.meta.updatedAt, parts });
    const js = `/* 자동 생성: tools/build_centerlines.js — 직접 수정하지 마세요. */\nwindow.HANGUL_WH_CENTERLINES = ${body};\n`;
    const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (prev !== js) fs.writeFileSync(OUT, js);
    return { count: Object.keys(parts).length, bytes: Buffer.byteLength(js), changed: prev !== js, problems };
}

function report(r) {
    const t = new Date().toLocaleTimeString();
    console.log(`[${t}] ${r.count}개 자소 → ${path.basename(OUT)} (${(r.bytes / 1024).toFixed(0)}KB)${r.changed ? ' 갱신됨' : ' 변경 없음'}`);
    if (r.problems.length) {
        console.log(`  ⚠ 검증 문제 ${r.problems.length}건`);
        r.problems.slice(0, 40).forEach(s => console.log('   - ' + s));
    } else {
        console.log('  ✅ 검증 통과');
    }
}

report(build());
if (WATCH) {
    console.log(`감시 중: ${SRC} (Ctrl+C 종료)`);
    let last = fs.statSync(SRC).mtimeMs;
    setInterval(() => {
        try {
            const m = fs.statSync(SRC).mtimeMs;
            if (m !== last) { last = m; report(build()); }
        } catch (e) { console.log('읽기 실패(재시도):', e.message); }
    }, 1000);
}
