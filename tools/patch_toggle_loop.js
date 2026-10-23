const fs = require('fs');
const file = 'c:/project/한글획순/index.html';
let content = fs.readFileSync(file, 'utf8');

const targetCRLF = '    playDemo() {\r\n';
const targetLF = '    playDemo() {\n';

const replacement = `    isLoopDemo: false,
    loopTimer: null,
    toggleLoopDemo() {
        this.isLoopDemo = !this.isLoopDemo;
        const btn = document.getElementById('btn-loop-demo');
        if (btn) {
            btn.textContent = this.isLoopDemo ? '🔁 무한 반복: ON' : '🔁 무한 반복: OFF';
            btn.className = this.isLoopDemo ? 'btn btn-accent' : 'btn btn-outline';
        }
        if (this.isLoopDemo) {
            this.playDemo();
        } else if (this.loopTimer) {
            clearTimeout(this.loopTimer);
            this.loopTimer = null;
        }
    },
    playDemo() {\n`;

const replacementCRLF = replacement.replace(/\n/g, '\r\n');

if (!content.includes('toggleLoopDemo() {')) {
    if (content.includes(targetCRLF)) {
        content = content.replace(targetCRLF, replacementCRLF);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Successfully inserted toggleLoopDemo method (CRLF)!');
    } else if (content.includes(targetLF)) {
        content = content.replace(targetLF, replacement);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Successfully inserted toggleLoopDemo method (LF)!');
    } else {
        console.error('Target playDemo() not found');
    }
} else {
    console.log('toggleLoopDemo() { already exists');
}
