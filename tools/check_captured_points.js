const fs = require('fs');
// Let's inspect the positions in hoik_soon_svg.html
const dir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d';
const html = fs.readFileSync(dir + '/hoik_soon_svg.html', 'utf8');
const polylines = html.match(/points="([^"]+)"/g) || [];
polylines.forEach((p, idx) => {
    const pts = p.replace('points="', '').replace('"', '').split(' ');
    console.log(`Stroke ${idx + 1}: p0=${pts[0]} pEnd=${pts[pts.length - 1]}`);
});
