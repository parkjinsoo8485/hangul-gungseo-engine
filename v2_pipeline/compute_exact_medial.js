const fontkit = require('./node_modules/fontkit');
const fs = require('fs');

const collection = fontkit.openSync('C:/Windows/Fonts/batang.ttc');
const gungsuh = collection.fonts[2];
const glyph = gungsuh.glyphForCodePoint('가'.charCodeAt(0));

// Find Cho 'ㄱ'
let choCommands = [];
let count = 0;
for (const cmd of glyph.path.commands) {
    if (cmd.command === 'moveTo') count++;
    if (count === 2) choCommands.push(cmd);
}

// 1. Densely sample the outline polygon
const poly = [];
let px = 0, py = 0;
for (const cmd of choCommands) {
    const a = cmd.args;
    if (cmd.command === 'moveTo') { px = a[0]; py = a[1]; poly.push([px, py]); }
    else if (cmd.command === 'lineTo') { px = a[0]; py = a[1]; poly.push([px, py]); }
    else if (cmd.command === 'quadraticCurveTo') {
        const cx = a[0], cy = a[1], ex = a[2], ey = a[3];
        for (let t = 0.05; t <= 1.001; t += 0.05) {
            const m = 1 - t;
            poly.push([m*m*px + 2*m*t*cx + t*t*ex, m*m*py + 2*m*t*cy + t*t*ey]);
        }
        px = ex; py = ey;
    }
}

// 2. Point in polygon test
function pointInPoly(x, y) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

// 3. Distance from point (x, y) to closest segment on polygon boundary
function distToBoundary(x, y) {
    let minDist = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const x1 = poly[j][0], y1 = poly[j][1];
        const x2 = poly[i][0], y2 = poly[i][1];
        const dx = x2 - x1, dy = y2 - y1;
        const L2 = dx*dx + dy*dy;
        if (L2 === 0) continue;
        let t = ((x - x1) * dx + (y - y1) * dy) / L2;
        t = Math.max(0, Math.min(1, t));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        const d = Math.hypot(x - projX, y - projY);
        if (d < minDist) minDist = d;
    }
    return minDist;
}

console.log('Computing 2D Distance Field Grid...');
const step = 4; // 4px grid
const minX = 40, maxX = 530, minY = 160, maxY = 650;
const cols = Math.ceil((maxX - minX) / step);
const rows = Math.ceil((maxY - minY) / step);

const grid = [];
for (let r = 0; r < rows; r++) {
    const row = new Float32Array(cols);
    const y = minY + r * step;
    for (let c = 0; c < cols; c++) {
        const x = minX + c * step;
        if (pointInPoly(x, y)) {
            row[c] = distToBoundary(x, y);
        } else {
            row[c] = -1; // outside
        }
    }
    grid.push(row);
}

// 4. Trace the ridge from Head -> Corner -> Tail
// Head is around X=120, Y=570
// Corner is around X=460, Y=450~500
// Tail is around X=70, Y=180

function getVal(x, y) {
    const c = Math.round((x - minX) / step);
    const r = Math.round((y - minY) / step);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return -1;
    return grid[r][c];
}

// For horizontal stroke (Y between 500 and 640):
// For each X from 120 to 450, find Y that maximizes distToBoundary
const horizRidge = [];
for (let x = 120; x <= 460; x += 15) {
    let bestY = 570, maxD = -1;
    for (let y = 520; y <= 620; y += 2) {
        const d = getVal(x, y);
        if (d > maxD) { maxD = d; bestY = y; }
    }
    if (maxD > 0) horizRidge.push([x, bestY, maxD]);
}

// Corner peak: In the corner box [X: 430~510, Y: 330~480], find the local maximum ridge
console.log('Horizontal ridge points:', horizRidge.length);

// For the downward/diagonal sweep from corner down to tail:
// We can parameterize by t or walk along the gradient ridge!
// Let's sample diagonal cross-sections from corner [X: 470, Y: 430] down to [X: 70, Y: 180]
const diagRidge = [];
const startPt = [460, 420];
const endPt = [65, 175];
const stepsCount = 30;

for (let i = 0; i <= stepsCount; i++) {
    const t = i / stepsCount;
    // Base center along the line
    const bx = startPt[0] * (1 - t) + endPt[0] * t;
    const by = startPt[1] * (1 - t) + endPt[1] * t;

    // Normal vector perpendicular to the line: dx = endPt[0]-startPt[0], dy = endPt[1]-startPt[1]
    const ldx = endPt[0] - startPt[0];
    const ldy = endPt[1] - startPt[1];
    const len = Math.hypot(ldx, ldy);
    const nx = -ldy / len;
    const ny = ldx / len;

    // Scan along normal [-120px to +120px] to find the maximum inscribed circle center!
    let bestX = bx, bestY = by, maxD = -1;
    for (let s = -120; s <= 120; s += 2) {
        const sx = bx + nx * s;
        const sy = by + ny * s;
        const d = getVal(sx, sy);
        if (d > maxD) {
            maxD = d;
            bestX = sx;
            bestY = sy;
        }
    }
    if (maxD > 0) {
        diagRidge.push([Math.round(bestX), Math.round(bestY), maxD]);
    }
}

// Combine and clean up into a smooth, single stroke
const fullCenterline = [];
horizRidge.forEach(p => fullCenterline.push([p[0], p[1], p[2]]));
diagRidge.forEach(p => {
    // Avoid sharp duplicate at corner
    const last = fullCenterline[fullCenterline.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 10) {
        fullCenterline.push([p[0], p[1], p[2]]);
    }
});

console.log('=== Extracted True Medial Axis Points ===');
fullCenterline.forEach((p, i) => {
    console.log(`Point ${i+1}: [${p[0]}, ${p[1]}] (Radius: ${p[2].toFixed(1)})`);
});

fs.writeFileSync('C:/한글획순/v2_pipeline/extracted_k_medial.json', JSON.stringify(fullCenterline, null, 2), 'utf8');
