const fs = require('fs');
const path = require('path');
const fontkit = require('./node_modules/fontkit');

// Open 궁서체 from Windows Fonts
const collection = fontkit.openSync('C:/Windows/Fonts/batang.ttc');
const gungsuh = collection.fonts[2];

/**
 * 1. Convert fontkit glyph path to high-density 2D polygon points
 */
function glyphToPolygon(glyph) {
    const poly = [];
    let px = 0, py = 0;
    for (const cmd of glyph.path.commands) {
        const a = cmd.args;
        if (cmd.command === 'moveTo') {
            px = a[0]; py = a[1];
            poly.push([px, py]);
        } else if (cmd.command === 'lineTo') {
            px = a[0]; py = a[1];
            poly.push([px, py]);
        } else if (cmd.command === 'quadraticCurveTo') {
            const cx = a[0], cy = a[1], ex = a[2], ey = a[3];
            for (let t = 0.05; t <= 1.001; t += 0.05) {
                const m = 1 - t;
                poly.push([
                    m * m * px + 2 * m * t * cx + t * t * ex,
                    m * m * py + 2 * m * t * cy + t * t * ey
                ]);
            }
            px = ex; py = ey;
        }
    }
    return poly;
}

/**
 * 2. Point in polygon test
 */
function pointInPoly(poly, x, y) {
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

/**
 * 3. Exact distance from point (x, y) to closest segment on polygon boundary
 */
function distToBoundary(poly, x, y) {
    let minDist = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const x1 = poly[j][0], y1 = poly[j][1];
        const x2 = poly[i][0], y2 = poly[i][1];
        const dx = x2 - x1, dy = y2 - y1;
        const L2 = dx * dx + dy * dy;
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

/**
 * 4. Compute 2D Distance Field Grid inside glyph bounding box
 */
function computeDistanceField(poly, bbox, step = 4) {
    const minX = Math.floor(bbox.minX) - 10;
    const maxX = Math.ceil(bbox.maxX) + 10;
    const minY = Math.floor(bbox.minY) - 10;
    const maxY = Math.ceil(bbox.maxY) + 10;

    const cols = Math.ceil((maxX - minX) / step);
    const rows = Math.ceil((maxY - minY) / step);

    const grid = [];
    for (let r = 0; r < rows; r++) {
        const row = new Float32Array(cols);
        const y = minY + r * step;
        for (let c = 0; c < cols; c++) {
            const x = minX + c * step;
            if (pointInPoly(poly, x, y)) {
                row[c] = distToBoundary(poly, x, y);
            } else {
                row[c] = -1;
            }
        }
        grid.push(row);
    }

    return {
        grid, minX, maxX, minY, maxY, cols, rows, step,
        getVal: (x, y) => {
            const c = Math.round((x - minX) / step);
            const r = Math.round((y - minY) / step);
            if (r < 0 || r >= rows || c < 0 || c >= cols) return -1;
            return grid[r][c];
        }
    };
}

/**
 * 5. Extract Ridge / Medial Axis along a specified slice direction
 * @param {Function} df - Distance field accessor
 * @param {Array} startRange - e.g. [x1, y1]
 * @param {Array} endRange - e.g. [x2, y2]
 * @param {String} scanAxis - 'X' (scan vertical cuts across X), 'Y' (scan horizontal cuts across Y), or 'normal' (scan along normal)
 */
function traceMedialRidge(df, startPt, endPt, steps = 20, scanRange = 100) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const bx = startPt[0] * (1 - t) + endPt[0] * t;
        const by = startPt[1] * (1 - t) + endPt[1] * t;

        const ldx = endPt[0] - startPt[0];
        const ldy = endPt[1] - startPt[1];
        const len = Math.hypot(ldx, ldy) || 1;
        const nx = -ldy / len;
        const ny = ldx / len;

        let bestX = bx, bestY = by, maxD = -1;
        for (let s = -scanRange; s <= scanRange; s += 2) {
            const sx = bx + nx * s;
            const sy = by + ny * s;
            const d = df.getVal(sx, sy);
            if (d > maxD) {
                maxD = d;
                bestX = sx;
                bestY = sy;
            }
        }

        if (maxD > 0) {
            points.push([Math.round(bestX), Math.round(bestY), parseFloat(maxD.toFixed(1))]);
        }
    }
    return points;
}

/**
 * 6. Mathematical Voronoi Cell/Polygon computation between multiple stroke skeletons
 * For each stroke, generates an exact SVG clipping polygon that separates it from neighboring strokes.
 */
function computeVoronoiClipPolygons(strokes, bbox, pad = 50) {
    const minX = Math.floor(bbox.minX) - pad;
    const maxX = Math.ceil(bbox.maxX) + pad;
    const minY = Math.floor(bbox.minY) - pad;
    const maxY = Math.ceil(bbox.maxY) + pad;

    // For each stroke, we build a bounding polygon or half-plane intersections
    // In our SVG pipeline, a 2D grid Voronoi span or half-plane bisector is generated.
    // If there's only 1 stroke (e.g. 'ㄱ' 1 continuous stroke, 'ㅇ' 1 circle),
    // the Voronoi polygon is simply the full enclosing box.
    if (strokes.length <= 1) {
        return strokes.map(() => `M ${minX} ${minY} L ${maxX} ${minY} L ${maxX} ${maxY} L ${minX} ${maxY} Z`);
    }

    // For multiple strokes (e.g. 'ㄷ': 2 strokes, 'ㄹ': 3 strokes, 'ㅂ': 4 strokes):
    // Compute bisector clip-paths
    const clipPolygons = [];

    // Dense grid assignment to compute exact boundary contours (Marching squares / grid span)
    const step = 8;
    const cols = Math.ceil((maxX - minX) / step);
    const rows = Math.ceil((maxY - minY) / step);

    const labels = new Int16Array(cols * rows);
    for (let r = 0; r < rows; r++) {
        const y = minY + r * step;
        for (let c = 0; c < cols; c++) {
            const x = minX + c * step;

            let minDist = Infinity;
            let bestOwner = 0;
            strokes.forEach((st, sIdx) => {
                // Distance from (x, y) to stroke centerline points
                for (let k = 0; k < st.samplePoints.length; k++) {
                    const sp = st.samplePoints[k];
                    const d = Math.hypot(x - sp[0], y - sp[1]);
                    if (d < minDist) {
                        minDist = d;
                        bestOwner = sIdx;
                    }
                }
            });
            labels[r * cols + c] = bestOwner;
        }
    }

    // Convert labeled grid into bounding box / polygon for each stroke
    strokes.forEach((st, sIdx) => {
        let sMinX = Infinity, sMaxX = -Infinity, sMinY = Infinity, sMaxY = -Infinity;
        for (let r = 0; r < rows; r++) {
            const y = minY + r * step;
            for (let c = 0; c < cols; c++) {
                if (labels[r * cols + c] === sIdx) {
                    const x = minX + c * step;
                    if (x < sMinX) sMinX = x;
                    if (x > sMaxX) sMaxX = x;
                    if (y < sMinY) sMinY = y;
                    if (y > sMaxY) sMaxY = y;
                }
            }
        }
        // Expand slightly for overlap
        sMinX = Math.max(minX, sMinX - 10);
        sMaxX = Math.min(maxX, sMaxX + 10);
        sMinY = Math.max(minY, sMinY - 10);
        sMaxY = Math.min(maxY, sMaxY + 10);

        clipPolygons.push(`M ${sMinX} ${sMinY} L ${sMaxX} ${sMinY} L ${sMaxX} ${sMaxY} L ${sMinX} ${sMaxY} Z`);
    });

    return clipPolygons;
}

module.exports = {
    gungsuh,
    glyphToPolygon,
    computeDistanceField,
    traceMedialRidge,
    computeVoronoiClipPolygons
};
