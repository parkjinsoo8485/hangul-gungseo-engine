const opentype = require('opentype.js');
opentype.load('fonts/Batang.woff', (err, font) => {
    if (err) return console.error(err);
    ['회', '의'].forEach(char => {
        console.log('=== ' + char + ' ===');
        const glyph = font.charToGlyph(char);
        const bbox = glyph.getBoundingBox();
        console.log('BBox (font units):', bbox);
        // in index.html, scale: x in [0, 100], y in [0, 100]
        // font ascender is usually ~800, descender ~-200, emSquare = 1000
        // in index.html: let x = (gx - fontOriginX) / fontEm * 100, y = 100 - (gy - fontOriginY) / fontEm * 100
        const p = glyph.getPath(0, 0, 1000);
        let curContour = [];
        const contours = [];
        p.commands.forEach(cmd => {
            if (cmd.type === 'M') {
                if (curContour.length) contours.push(curContour);
                curContour = [cmd];
            } else {
                curContour.push(cmd);
            }
        });
        if (curContour.length) contours.push(curContour);
        contours.forEach((c, idx) => {
            let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
            c.forEach(cmd => {
                ['x', 'x1', 'x2'].forEach(k => { if (cmd[k] !== undefined) { minX = Math.min(minX, cmd[k]); maxX = Math.max(maxX, cmd[k]); } });
                ['y', 'y1', 'y2'].forEach(k => { if (cmd[k] !== undefined) { minY = Math.min(minY, cmd[k]); maxY = Math.max(maxY, cmd[k]); } });
            });
            console.log('Contour ' + idx + ': x=[' + minX.toFixed(1) + ', ' + maxX.toFixed(1) + '], y=[' + minY.toFixed(1) + ', ' + maxY.toFixed(1) + ']');
        });
    });
});
