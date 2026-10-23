/** 노드에서 index.html 의 순수 계산부 + 브리지를 불러와 전 음절 하네스를 실행·검증한다.  node tools/verify_harness.js */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const inline = html.split(/<script>\r?\n/)[1] || '';
const core = inline.split(/const Engine = \{/)[0];

const ctx = { console, setTimeout, window: undefined };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'warehouse_centerlines.js'), 'utf8').replace('window.', 'globalThis.'), ctx);
vm.runInContext(core + '\n;globalThis.__env={decomposeHangul,VOWEL_TYPE,normalizeJamoStrokes,mapSubBox,STYLE_PRESETS};', ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'warehouse_bridge.js'), 'utf8'), ctx);
const WH = ctx.WH;
WH.env = ctx.__env;

(async () => {
    const sp = ctx.__env.STYLE_PRESETS.gungseo;
    const all = WH.allSyllables();
    const before = all.map(c => WH.checkSyllable(c, sp)).filter(r => r.issues.length);
    const kinds = {};
    before.forEach(r => r.issues.forEach(i => { const k = i.t + (i.a ? `:${i.a}-${i.b}` : `:${i.part}`); kinds[k] = (kinds[k] || 0) + 1; }));
    console.log(`보정 전: 문제 음절 ${before.length}/${all.length}`, kinds);
    const rep = await WH.runHarness(all, sp, {});
    console.log('라운드:', rep.rounds.map(r => `${r.round}:${r.failing}`).join(' → '), `| 검사 ${rep.checked}, 미지원 ${rep.skipped}`);
    const left = {};
    rep.failing.forEach(r => r.issues.forEach(i => { const k = i.t + (i.a ? `:${i.a}-${i.b}` : `:${i.part}`); left[k] = (left[k] || 0) + 1; }));
    console.log('남은 문제 유형:', left);
    console.log('예시:', rep.failing.slice(0, 12).map(r => r.ch + '(' + r.issues.map(i => i.t + (i.d ? i.d.toFixed(1) : '')).join(',') + ')').join(' '));
    const byV = {};
    rep.failing.forEach(r => { const d = ctx.__env.decomposeHangul(r.ch); const k = d.jung + (d.jong ? '+종' : ''); byV[k] = (byV[k] || 0) + 1; });
    console.log('남은 문제 모음별:', JSON.stringify(byV));
    const ex = rep.failing.find(r => r.ch === String.fromCharCode(0xAD00));
    if (ex) console.log('과:', JSON.stringify(ex.issues.map(i => ({ t: i.t, d: i.d && +i.d.toFixed(1), bp: i.bp && i.bp.map(p => p.map(v => +v.toFixed(1))) }))), JSON.stringify(WH.offsets['과']), WH.choT['과']);
    const shifted = Object.keys(WH.offsets).length;
    console.log('보정값이 생긴 음절:', shifted);
    if (process.argv[2] === '--dump') fs.writeFileSync(path.join(root, 'harness_offsets.json'), JSON.stringify(WH.offsets));
})();

