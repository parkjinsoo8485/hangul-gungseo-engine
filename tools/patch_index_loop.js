const fs = require('fs');
const file = 'c:/project/한글획순/index.html';
let content = fs.readFileSync(file, 'utf8');

// 1. 버튼 추가
const btnTarget = '<button class="btn btn-accent" onclick="Engine.playDemo()">▶ 획순 시범 쓰기</button>';
const btnReplace = '<button class="btn btn-accent" onclick="Engine.playDemo()">▶ 획순 시범 쓰기</button>\n                <button id="btn-loop-demo" class="btn btn-outline" onclick="Engine.toggleLoopDemo()">🔁 무한 반복: OFF</button>';

if (!content.includes('btn-loop-demo')) {
    content = content.replace(btnTarget, btnReplace);
    console.log('Added loop demo button');
}

// 2. RenderHarness 클래스 삽입 (<script> 태그 바로 다음)
const harnessCode = `class RenderHarness {
    constructor() {
        this.dirty = false;
        this.running = false;
        this.rafId = null;
        this.subscribers = new Set();
        this.lastFrameTime = 0;
        this.fps = 60;
    }

    markDirty(reason = 'unknown') {
        this.dirty = true;
        if (!this.running) this.start();
    }

    subscribe(fn) {
        this.subscribers.add(fn);
    }

    unsubscribe(fn) {
        this.subscribers.delete(fn);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this._loop(performance.now());
    }

    stop() {
        this.running = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    _loop(now) {
        if (!this.running) return;
        this.rafId = requestAnimationFrame((t) => this._loop(t));

        const elapsed = now - this.lastFrameTime;
        if (elapsed < 1000 / this.fps) return;

        if (this.dirty) {
            this.dirty = false;
            this.lastFrameTime = now;
            this.subscribers.forEach(fn => {
                try { fn(); } catch(e) { console.error('[RenderHarness]', e); }
            });
        }
    }
}
window.RenderHarness = new RenderHarness();
`;

if (!content.includes('class RenderHarness')) {
    const scriptTagCRLF = '<script src="warehouse_bridge.js"></script>\r\n<script>';
    const scriptTagLF = '<script src="warehouse_bridge.js"></script>\n<script>';
    if (content.includes(scriptTagCRLF)) {
        content = content.replace(scriptTagCRLF, scriptTagCRLF + '\r\n' + harnessCode);
        console.log('Added RenderHarness class (CRLF)');
    } else if (content.includes(scriptTagLF)) {
        content = content.replace(scriptTagLF, scriptTagLF + '\n' + harnessCode);
        console.log('Added RenderHarness class (LF)');
    }
}

// 3. Engine에 toggleLoopDemo 및 playDemo 무한루프 지원 추가
const playTarget = 'this.setMessage(`✨ [${modeTitle}] 시범 쓰기 완료! 상단에서 다른 서체 카드를 클릭해 조형 차이를 비교해보세요.`);\n                return;';
const playTargetCRLF = 'this.setMessage(`✨ [${modeTitle}] 시범 쓰기 완료! 상단에서 다른 서체 카드를 클릭해 조형 차이를 비교해보세요.`);\r\n                return;';

const playReplace = 'if (this.isLoopDemo) {\n                    this.setMessage(`✨ [${modeTitle}] 1회 완필! 1초 후 자동으로 다시 시작합니다 (무한 루핑)...`);\n                    this.loopTimer = setTimeout(() => {\n                        if (this.isLoopDemo) this.playDemo();\n                    }, 1000);\n                } else {\n                    this.setMessage(`✨ [${modeTitle}] 시범 쓰기 완료! 상단에서 다른 서체 카드를 클릭해 조형 차이를 비교해보세요.`);\n                }\n                return;';
const playReplaceCRLF = 'if (this.isLoopDemo) {\r\n                    this.setMessage(`✨ [${modeTitle}] 1회 완필! 1초 후 자동으로 다시 시작합니다 (무한 루핑)...`);\r\n                    this.loopTimer = setTimeout(() => {\r\n                        if (this.isLoopDemo) this.playDemo();\r\n                    }, 1000);\r\n                } else {\r\n                    this.setMessage(`✨ [${modeTitle}] 시범 쓰기 완료! 상단에서 다른 서체 카드를 클릭해 조형 차이를 비교해보세요.`);\r\n                }\r\n                return;';

if (content.includes(playTarget)) {
    content = content.replace(playTarget, playReplace);
    console.log('Updated playDemo with loop support (LF)');
} else if (content.includes(playTargetCRLF)) {
    content = content.replace(playTargetCRLF, playReplaceCRLF);
    console.log('Updated playDemo with loop support (CRLF)');
}

// toggleLoopDemo 메서드 추가
const methodTarget = '    playDemo() {';
const methodReplace = `    isLoopDemo: false,
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
    playDemo() {`;

if (!content.includes('toggleLoopDemo()')) {
    content = content.replace(methodTarget, methodReplace);
    console.log('Added toggleLoopDemo method');
}

fs.writeFileSync(file, content, 'utf8');
console.log('index.html update complete.');
