const fontkit = require('./node_modules/fontkit');
const fs = require('fs');

const collection = fontkit.openSync('C:/Windows/Fonts/batang.ttc');
const gungsuh = collection.fonts[2]; // Gungsuh

const glyph = gungsuh.glyphForCodePoint('가'.charCodeAt(0));
const path = glyph.path;

// Separate subpaths by 'moveTo'
const subpaths = [];
let currentSubpath = [];

for (const cmd of path.commands) {
    if (cmd.command === 'moveTo') {
        if (currentSubpath.length > 0) subpaths.push(currentSubpath);
        currentSubpath = [cmd];
    } else {
        currentSubpath.push(cmd);
    }
}
if (currentSubpath.length > 0) subpaths.push(currentSubpath);

console.log(`=== Analysis of '가' in Gungsuh ===`);
console.log(`Subpaths count: ${subpaths.length}`);

function cmdToSVG(cmd) {
    const a = cmd.args;
    switch (cmd.command) {
        case 'moveTo': return `M ${a[0]} ${a[1]}`;
        case 'lineTo': return `L ${a[0]} ${a[1]}`;
        case 'quadraticCurveTo': return `Q ${a[0]} ${a[1]} ${a[2]} ${a[3]}`;
        case 'bezierCurveTo': return `C ${a[0]} ${a[1]} ${a[2]} ${a[3]} ${a[4]} ${a[5]}`;
        case 'closePath': return `Z`;
        default: return '';
    }
}

subpaths.forEach((sp, idx) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    sp.forEach(cmd => {
        const a = cmd.args;
        if (!a) return;
        for (let i = 0; i < a.length; i += 2) {
            const x = a[i], y = a[i+1];
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
    });
    const dStr = sp.map(cmdToSVG).join(' ') + ' Z';
    const label = minX < 500 ? "초성 'ㄱ'" : "중성 'ㅏ'";
    console.log(`\nSubpath ${idx + 1} (${label}):`);
    console.log(`  BBox: X [${minX.toFixed(1)} ~ ${maxX.toFixed(1)}], Y [${minY.toFixed(1)} ~ ${maxY.toFixed(1)}]`);
    console.log(`  Width: ${(maxX - minX).toFixed(1)}, Height: ${(maxY - minY).toFixed(1)}`);
    console.log(`  Command count: ${sp.length}`);
    console.log(`  SVG Path preview: ${dStr.slice(0, 100)}...`);
});

// Create an HTML preview file to visually inspect the two contours!
const svg1 = subpaths[0].map(cmdToSVG).join(' ') + ' Z';
const svg2 = subpaths[1].map(cmdToSVG).join(' ') + ' Z';

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>'가' 글리프 분해 검증</title>
<style>
  body { background: #1e1e24; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 20px; }
  .grid { display: flex; gap: 20px; margin-top: 20px; }
  .card { background: #2b2b36; border: 1px solid #444; border-radius: 8px; padding: 15px; text-align: center; }
  svg { background: #111; border: 1px solid #555; }
</style>
</head>
<body>
  <h2>궁서체 '가' 폰트 원본 윤곽선 분해 검증</h2>
  <div class="grid">
    <div class="card">
      <h3>1. 원본 전체 글리프 ('가')</h3>
      <svg width="300" height="300" viewBox="0 -200 1100 1200" transform="scale(1, -1)">
        <path d="${glyph.path.toSVG()}" fill="#38bdf8" opacity="0.8" />
      </svg>
    </div>
    <div class="card">
      <h3>2. 분리된 폐곡선 1 (초성 'ㄱ')</h3>
      <svg width="300" height="300" viewBox="0 -200 1100 1200" transform="scale(1, -1)">
        <path d="${svg2}" fill="#ef4444" opacity="0.8" />
      </svg>
    </div>
    <div class="card">
      <h3>3. 분리된 폐곡선 2 (중성 'ㅏ')</h3>
      <svg width="300" height="300" viewBox="0 -200 1100 1200" transform="scale(1, -1)">
        <path d="${svg1}" fill="#10b981" opacity="0.8" />
      </svg>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync('C:/한글획순/v2_pipeline/test_ga_inspection.html', html, 'utf8');
console.log('\nGenerated HTML inspection: C:/한글획순/v2_pipeline/test_ga_inspection.html');
