const fs = require('fs');
const dir = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d';
// Let's copy hoik_soon_actual_cdp.png to an artifact viewable name
fs.copyFileSync(dir + '/hoik_soon_actual_cdp.png', dir + '/view_hoik_soon_cdp.png');
console.log('Copied to view_hoik_soon_cdp.png');
