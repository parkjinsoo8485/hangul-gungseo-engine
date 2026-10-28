const fs = require('fs');
// Let's copy hoik_soon_current_rendered.png to artifact directory and also check if we can inspect its pixels
const p = 'C:/Users/user/.gemini/antigravity/brain/1da444f2-688c-42da-97f4-47f722045f3d/hoik_soon_current_rendered.png';
console.log('File exists:', fs.existsSync(p), 'size:', fs.statSync(p).size);
