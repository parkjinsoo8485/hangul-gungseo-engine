const fs = require('fs');
const dir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d';
const html = fs.readFileSync(dir + '/hoik_soon_svg.html', 'utf8');
const guideMatch = html.match(/<g id="layer-guide"[^>]*>([\s\S]*?)<\/g>/);
if (guideMatch) {
    console.log('Guide content length:', guideMatch[1].length);
    const circles = guideMatch[1].match(/<circle[^>]+>/g) || [];
    console.log('Circles:', circles);
    const texts = guideMatch[1].match(/<text[^>]*>[\s\S]*?<\/text>/g) || [];
    console.log('Texts:', texts);
}
