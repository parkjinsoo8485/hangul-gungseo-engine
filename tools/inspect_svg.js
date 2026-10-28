const fs = require('fs');
const dir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d';
const html = fs.readFileSync(dir + '/hoik_soon_svg.html', 'utf8');
const polylines = html.match(/<polyline class="guide-spine"[^>]+>/g) || [];
console.log('Polylines count:', polylines.length);
polylines.forEach((pl, i) => console.log(i + 1, pl.slice(0, 100)));
const badges = html.match(/<g class="stroke-badge"[\s\S]*?<\/g>/g) || [];
console.log('Badges count:', badges.length);
badges.forEach((b, i) => {
    const txtMatch = b.match(/<text[^>]*>(.*?)<\/text>/);
    const cxMatch = b.match(/cx="([^"]+)"/);
    const cyMatch = b.match(/cy="([^"]+)"/);
    console.log(`Badge ${i + 1}: text=${txtMatch ? txtMatch[1] : ''} cx=${cxMatch ? cxMatch[1] : ''} cy=${cyMatch ? cyMatch[1] : ''}`);
});
