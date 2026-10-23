/** 대표 음절 진단: node tools/diag.js 한 글 각 간 곰 닭 */
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const core = (html.split(/<script>\r?\n/)[1] || '').split(/const Engine = \{/)[0];
const ctx = { console, setTimeout }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'warehouse_centerlines.js'), 'utf8').replace('window.', 'globalThis.'), ctx);
vm.runInContext(core + '\n;globalThis.__env={decomposeHangul,VOWEL_TYPE,normalizeJamoStrokes,mapSubBox,STYLE_PRESETS};', ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'warehouse_bridge.js'), 'utf8'), ctx);
const WH = ctx.WH; WH.env = ctx.__env;
const sp = ctx.__env.STYLE_PRESETS.gungseo;
const chars = process.argv.slice(2).join('').split('');
for (const ch of (chars.length ? chars : '한글각간곰닭없뷁')) {
    const lay = WH.layoutSyllable(ch, sp);
    if (!lay) { console.log(ch, 'skip'); continue; }
    const ext = lay.map(p => {
        const pts = p.strokes.flat();
        const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
        return `${p.part}(${p.id.split('_')[1]}) x${Math.min(...xs).toFixed(0)}-${Math.max(...xs).toFixed(0)} y${Math.min(...ys).toFixed(0)}-${Math.max(...ys).toFixed(0)}`;
    });
    const r = WH.checkSyllable(ch, sp);
    console.log(ch, ext.join(' | '), '=>', r.issues.map(i => i.t + (i.d ? ':' + i.a + '-' + i.b + '=' + i.d.toFixed(1) : ':' + i.part)).join(',') || 'OK');
}
