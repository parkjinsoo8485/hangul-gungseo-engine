const fs = require('fs');

let html = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

// 1. Add speed control dropdown in top-controls
const oldControls = `<button class="btn btn-accent" onclick="Engine.playDemo()">▶ 획순 시범 쓰기</button>
                <button id="btn-loop-demo" class="btn btn-outline" onclick="Engine.toggleLoopDemo()">🔁 무한 반복: OFF</button>`;

const newControls = `<button class="btn btn-accent" onclick="Engine.playDemo()">▶ 획순 시범 쓰기</button>
                <div style="display:inline-flex; align-items:center; gap:6px; background:#fff; border:1.5px solid #2c2c2c; border-radius:6px; padding:6px 10px; font-size:13px; font-weight:bold;">
                    <span>⏱️ 시범 속도:</span>
                    <select id="select-demo-speed" onchange="Engine.setDemoSpeed(this.value)" style="border:none; background:transparent; font-weight:bold; cursor:pointer; outline:none; color:#8b2635;">
                        <option value="0.6">매우 느리게 (학습 집중)</option>
                        <option value="1.0" selected>느리게 (학습 표준)</option>
                        <option value="1.8">보통</option>
                        <option value="3.0">빠르게</option>
                    </select>
                </div>
                <button id="btn-loop-demo" class="btn btn-outline" onclick="Engine.toggleLoopDemo()">🔁 무한 반복: OFF</button>`;

if (html.includes(oldControls)) {
    html = html.replace(oldControls, newControls);
    console.log('Added speed UI control.');
} else if (html.includes(oldControls.replace(/\n/g, '\r\n'))) {
    html = html.replace(oldControls.replace(/\n/g, '\r\n'), newControls.replace(/\n/g, '\r\n'));
    console.log('Added speed UI control (CRLF).');
}

// 2. Add setDemoSpeed method and slow, educational playDemo implementation
const oldPlayDemoMarker = '    playDemo() {\r\n        this.stopDemo();';
const oldPlayDemoMarkerLF = '    playDemo() {\n        this.stopDemo();';

const playDemoStart = html.indexOf(oldPlayDemoMarker) >= 0 ? html.indexOf(oldPlayDemoMarker) : html.indexOf(oldPlayDemoMarkerLF);
const playDemoEnd = html.indexOf('toggleLayers() {', playDemoStart);

if (playDemoStart >= 0 && playDemoEnd >= 0) {
    const newPlayDemoCode = `    demoSpeedMultiplier: 1.0,
    setDemoSpeed(val) {
        this.demoSpeedMultiplier = parseFloat(val) || 1.0;
        const speedName = this.demoSpeedMultiplier <= 0.6 ? '매우 느리게 (학습 집중)' : this.demoSpeedMultiplier <= 1.0 ? '느리게 (학습 표준)' : this.demoSpeedMultiplier <= 1.8 ? '보통' : '빠르게';
        this.setMessage('⏱️ 획순 시범 쓰기 속도 설정: [' + speedName + ']');
        if (this.demoTimer) {
            this.playDemo();
        }
    },
    playDemo() {
        this.stopDemo();
        this.resetPractice();
        if (this.strokes.length === 0) return;

        const modeTitle = this.styleParams.name;
        this.setMessage('🖌️ [' + modeTitle + '] 획순에 맞춰 시범을 쓰는 중입니다...');

        // [규칙 5] 각 획의 누적 곡선 길이(Arc-length) 사전 계산 (자소 크기·점 밀도와 무관한 물리적 등속 이동 보장)
        const strokeLens = this.strokes.map(pts => {
            const cum = new Float32Array(pts.length);
            for (let i = 1; i < pts.length; i++) {
                cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
            }
            return { cum, total: cum[pts.length - 1] || 1 };
        });

        let sIdx = 0;
        let curDist = 0;
        let pauseFrames = 0;
        // 학습을 위해 기필/중봉/수필 운필을 눈으로 편안하게 따라갈 수 있도록 기본 속도를 안정적인 저속으로 조정
        const speedFactor = this.demoSpeedMultiplier || 1.0;
        const speedDist = 1.15 * speedFactor;

        const stepAnim = () => {
            if (sIdx >= this.strokes.length) {
                this.demoTimer = null;
                this.currentStroke = this.strokes.length;
                this.highlightCurrentStartDot();
                if (this.isLoopDemo) {
                    this.setMessage('✨ [' + modeTitle + '] 1회 완필! 1초 후 자동으로 다시 시작합니다 (무한 루핑)...');
                    this.loopTimer = setTimeout(() => {
                        if (this.isLoopDemo) this.playDemo();
                    }, 1000);
                } else {
                    this.setMessage('✨ [' + modeTitle + '] 시범 쓰기 완료! 상단에서 다른 서체 카드를 클릭해 조형 차이를 비교해보세요.');
                }
                return;
            }

            if (pauseFrames > 0) {
                pauseFrames--;
                this.demoTimer = requestAnimationFrame(stepAnim);
                return;
            }

            this.currentStroke = sIdx;
            this.highlightCurrentStartDot();

            const pts = this.strokes[sIdx];
            const { cum, total } = strokeLens[sIdx];
            curDist = Math.min(total, curDist + speedDist);

            // 누적 거리에 해당하는 점 인덱스 찾기
            let pIdx = 0;
            while (pIdx < pts.length - 1 && cum[pIdx] < curDist) pIdx++;
            pIdx = Math.max(2, pIdx);
            this.currentStep = pIdx;
            this.updateActiveRender();

            if (curDist >= total || pIdx >= pts.length - 1) {
                sIdx++;
                curDist = 0;
                // 한 획이 끝나면 학습자가 기필 머리와 획 순서를 충분히 인지할 수 있도록 획간 정지 시간(약 300ms) 부여
                pauseFrames = Math.round(18 / Math.max(0.4, speedFactor));
            }
            this.demoTimer = requestAnimationFrame(stepAnim);
        };

        this.demoTimer = requestAnimationFrame(stepAnim);
    },\n\n    `;

    html = html.slice(0, playDemoStart) + newPlayDemoCode + html.slice(playDemoEnd);
    console.log('playDemo replaced with educational slow speed and inter-stroke pause.');
} else {
    console.error('Could not find playDemo boundaries', { playDemoStart, playDemoEnd });
}

fs.writeFileSync('c:/project/한글획순/index.html', html, 'utf8');
console.log('index.html updated successfully.');
