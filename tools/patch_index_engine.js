const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// 1. Patch ownership in buildGlyphData
const oldOwnershipTarget = `            // 4) 소유권 배정 (동일 자소 내 T자 교차부에서 관통 주 획의 몸통 내부 보호)
            const owners = new Int16Array(P);
            const effN = new Float64Array(K);
            for (let p = 0; p < P; p++) {
                for (let k = 0; k < K; k++) effN[k] = D[p * K + k] / w[k];

                for (let kA = 0; kA < K; kA++) {
                    if (effN[kA] > 0.96) continue;
                    const jA = Ix[p * K + kA], uA = pu[jA];
                    if (uA < 0.10 || uA > 0.90) continue;
                    for (let kB = 0; kB < K; kB++) {
                        if (kB === kA || metaK[kA].part !== metaK[kB].part || effN[kB] > 1.45) continue;
                        const jB = Ix[p * K + kB], uB = pu[jB];
                        const dot = Math.abs(ptx[jA] * ptx[jB] + pty[jA] * pty[jB]);
                        if (dot >= 0.68) continue;
                        if ((kB < kA && uB > 0.78) || (kB > kA && uB < 0.22)) {
                            effN[kB] = Math.max(effN[kB], 1.38);
                        }
                    }
                }

                let nmin = 1e12, fb = 0;
                for (let k = 0; k < K; k++) {
                    if (effN[k] < nmin) { nmin = effN[k]; fb = k; }
                }
                let owner = fb;
                for (let k = 0; k < K; k++) {
                    if (effN[k] <= nmin + 0.16 && effN[k] <= 1.32) { owner = k; break; }
                }
                owners[p] = owner;
            }`;

const newOwnershipCode = `            // 4) 소유권 배정 (동일 자소 내 관통 주 획의 몸통 보호 및 T자 접합부 하프스페이스 격리)
            const owners = new Int16Array(P);
            const effN = new Float64Array(K);
            for (let p = 0; p < P; p++) {
                for (let k = 0; k < K; k++) effN[k] = D[p * K + k] / w[k];

                // [규칙 1 & 2] 동일 자소 내 선행 관통획(Trunk) 보호 및 후속 가지획(Branch) 간섭 차단
                for (let kA = 0; kA < K; kA++) {
                    const jA = Ix[p * K + kA], uA = pu[jA];
                    const isTrunkBody = (uA >= 0.05 && uA <= 0.95);
                    const inCorridor = effN[kA] <= 1.25;

                    for (let kB = 0; kB < K; kB++) {
                        if (kB === kA || metaK[kA].part !== metaK[kB].part) continue;
                        const jB = Ix[p * K + kB], uB = pu[jB];
                        const dot = Math.abs(ptx[jA] * ptx[jB] + pty[jA] * pty[jB]);

                        // (A) 선행 관통획 kA의 몸통 픽셀은 후속 가지획 kB(kB > kA)가 침범할 수 없음
                        if (kB > kA && inCorridor && isTrunkBody) {
                            if (uB <= 0.38 || dot < 0.82) {
                                effN[kB] += 5.0; // kB가 kA의 몸통을 파먹는 것을 원천 차단
                            }
                        }
                        // (B) 반대로 kA가 후속획 kB의 끝에 닿는 경우(kB < kA이고 uA가 시작부)
                        else if (kB < kA && effN[kB] <= 1.25 && (uB >= 0.05 && uB <= 0.95)) {
                            if (uA <= 0.35 || dot < 0.82) {
                                effN[kA] += 5.0;
                            }
                        }
                    }
                }

                // [규칙 4] 작은 획(꼭지 점 등, pts <= 35) 최소 잉크 보장: 큰 획에 먹히지 않도록 보호
                for (let k = 0; k < K; k++) {
                    const kLen = starts[k + 1] - starts[k];
                    if (kLen <= 35 && effN[k] <= 1.50 && D[p * K + k] <= w[k] * 1.5) {
                        effN[k] = Math.min(effN[k], 0.55);
                    }
                }

                let nmin = 1e12, fb = 0;
                for (let k = 0; k < K; k++) {
                    if (effN[k] < nmin) { nmin = effN[k]; fb = k; }
                }
                let owner = fb;
                for (let k = 0; k < K; k++) {
                    if (effN[k] <= nmin + 0.16 && effN[k] <= 1.32) { owner = k; break; }
                }
                owners[p] = owner;
            }`;

// Normalize newlines for matching
const normOld = oldOwnershipTarget.replace(/\r\n/g, '\n');
const normHtml = html.replace(/\r\n/g, '\n');

if (!normHtml.includes(normOld)) {
    console.error('Could not find oldOwnershipTarget in index.html!');
    process.exit(1);
}

let patchedHtml = normHtml.replace(normOld, newOwnershipCode.replace(/\r\n/g, '\n'));

// 2. Patch MIN_AREA in island healing
patchedHtml = patchedHtml.replace(
    'const MIN_AREA = 80;',
    'const MIN_AREA = 250;'
);
patchedHtml = patchedHtml.replace(
    'if (comp.length >= MIN_AREA || comp.length >= strokeCounts[own] * 0.35) continue;',
    'if (comp.length >= MIN_AREA || comp.length >= strokeCounts[own] * 0.40) continue;'
);

// 3. Patch playDemo for Arc-length Uniform Velocity
const oldPlayDemo = `    playDemo() {
        this.resetPractice();
        if (this.strokes.length === 0) return;

        const modeTitle = this.styleParams.name;
        this.setMessage(\`🖌️ [\${modeTitle}] 획순에 맞춰 시범을 쓰는 중입니다...\`);
        let sIdx = 0;
        let pIdx = 2;
        const speedStep = this.charCount >= 3 ? 2 : 1;

        const stepAnim = () => {
            if (sIdx >= this.strokes.length) {
                this.demoTimer = null;
                this.currentStroke = this.strokes.length;
                this.highlightCurrentStartDot();
                if (this.isLoopDemo) {
                    this.setMessage(\`✨ [\${modeTitle}] 1회 완필! 1초 후 자동으로 다시 시작합니다 (무한 루핑)...\`);
                    this.loopTimer = setTimeout(() => {
                        if (this.isLoopDemo) this.playDemo();
                    }, 1000);
                } else {
                    this.setMessage(\`✨ [\${modeTitle}] 시범 쓰기 완료! 상단에서 다른 서체 카드를 클릭해 조형 차이를 비교해보세요.\`);
                }
                return;
            }
            this.currentStroke = sIdx;
            this.highlightCurrentStartDot();

            const pts = this.strokes[sIdx];
            pIdx = Math.min(pts.length, pIdx + speedStep);
            this.currentStep = pIdx;
            this.updateActiveRender();

            if (pIdx >= pts.length) {
                sIdx++;
                pIdx = 2;
            }
            this.demoTimer = requestAnimationFrame(stepAnim);
        };

        this.demoTimer = requestAnimationFrame(stepAnim);
    },`;

const newPlayDemo = `    playDemo() {
        this.stopDemo();
        this.resetPractice();
        if (this.strokes.length === 0) return;

        const modeTitle = this.styleParams.name;
        this.setMessage(\`🖌️ [\${modeTitle}] 획순에 맞춰 시범을 쓰는 중입니다...\`);

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
        // 물리적 픽셀 이동 속도 (초당 약 60프레임 기준, 프레임당 약 3.8 단위)
        const speedDist = this.charCount >= 3 ? 4.8 : 3.8;

        const stepAnim = () => {
            if (sIdx >= this.strokes.length) {
                this.demoTimer = null;
                this.currentStroke = this.strokes.length;
                this.highlightCurrentStartDot();
                if (this.isLoopDemo) {
                    this.setMessage(\`✨ [\${modeTitle}] 1회 완필! 1초 후 자동으로 다시 시작합니다 (무한 루핑)...\`);
                    this.loopTimer = setTimeout(() => {
                        if (this.isLoopDemo) this.playDemo();
                    }, 1000);
                } else {
                    this.setMessage(\`✨ [\${modeTitle}] 시범 쓰기 완료! 상단에서 다른 서체 카드를 클릭해 조형 차이를 비교해보세요.\`);
                }
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
            }
            this.demoTimer = requestAnimationFrame(stepAnim);
        };

        this.demoTimer = requestAnimationFrame(stepAnim);
    },`;

if (!patchedHtml.includes(oldPlayDemo.replace(/\r\n/g, '\n'))) {
    console.error('Could not find oldPlayDemo in index.html!');
    process.exit(1);
}

patchedHtml = patchedHtml.replace(oldPlayDemo.replace(/\r\n/g, '\n'), newPlayDemo.replace(/\r\n/g, '\n'));

// Restore CRLF line endings
fs.writeFileSync('index.html', patchedHtml.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully patched index.html!');
