const fs = require('fs');
const file = 'c:/project/한글획순/index.html';
let content = fs.readFileSync(file, 'utf8');

const target = 'window.RenderHarness = new RenderHarness();';
const replacement = "(typeof window !== 'undefined' ? window : globalThis).RenderHarness = new RenderHarness();";

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed RenderHarness global assignment for safe node/browser execution');
} else {
    console.log('Target already replaced or not found');
}
