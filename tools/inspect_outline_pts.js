const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));

// Parse SVG path commands
function getPathPoints(d) {
    const pts = [];
    const re = /([MLQZ])\s*([^MLQZ]*)/gi;
    let m;
    while ((m = re.exec(d)) !== null) {
        const cmd = m[1].toUpperCase();
        const coords = m[2].trim().split(/[\s,]+/).filter(Boolean).map(Number);
        for (let i = 0; i < coords.length; i += 2) {
            if (!isNaN(coords[i]) && !isNaN(coords[i+1])) {
                pts.push([coords[i], coords[i+1]]);
            }
        }
    }
    return pts;
}

['Jung_T1_ㅜ', 'Jung_T2_ㅜ', 'Jung_T2_ㅚ'].forEach(id => {
    const p = raw.parts[id];
    const pts = getPathPoints(p.gungsuhOutline);
    console.log(`\n=== Outline points for ${id} (total ${pts.length}) ===`);
    // Stem points: points with y in the lower half of outline
    const ys = pts.map(pt => pt[1]);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const midY = (minY + maxY) / 2;
    console.log(`y range: [${minY}..${maxY}], midY=${midY}`);
    const botPts = pts.filter(pt => pt[1] < midY);
    console.log(`Bottom points (y < ${midY}): count=${botPts.length}`);
    const botXs = botPts.map(pt => pt[0]);
    console.log(`Bottom x range: [${Math.min(...botXs)}..${Math.max(...botXs)}]`);
    console.log('Sample bot points:', botPts.slice(0, 10));
});
