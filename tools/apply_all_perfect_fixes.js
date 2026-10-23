const fs = require('fs');

console.log('--- 1. Patching warehouse_centerlines.js ---');
let wh = fs.readFileSync('c:/project/한글획순/warehouse_centerlines.js', 'utf8');

// Fix Cho_T1_ㅍ: terminate vertical legs cleanly on bottom bar (at y=427 and y=422)
// Old Cho_T1_ㅍ:
// "Cho_T1_ㅍ":{"c":"ㅍ","r":"cho","t":1,"b":[83,355,413,302],"m":[[[117,626],[303,619],[428,632]],[[206,585],[206,518],[196,380]],[[378,576],[378,513],[423,396]],[[103,425],[279,429],[476,417]]],"w":[32,20,20,32]}
wh = wh.replace(
    '"Cho_T1_ㅍ":{"c":"ㅍ","r":"cho","t":1,"b":[83,355,413,302],"m":[[[117,626],[303,619],[428,632]],[[206,585],[206,518],[196,380]],[[378,576],[378,513],[423,396]],[[103,425],[279,429],[476,417]]],"w":[32,20,20,32]}',
    '"Cho_T1_ㅍ":{"c":"ㅍ","r":"cho","t":1,"b":[83,355,413,302],"m":[[[117,626],[303,619],[428,632]],[[206,585],[206,518],[206,427]],[[378,576],[378,513],[378,422]],[[103,425],[279,429],[476,417]]],"w":[32,20,20,32]}'
);

// Fix Jung_T2_ㅠ: separate left stem and right stem so stroke 1 is not duplicate of stroke 2
// Old Jung_T2_ㅠ:
// "Jung_T2_ㅠ":{"c":"ㅠ","r":"jung","t":2,"b":[100,440,824,220],"m":[[[355,622],[514,622],[656,627]],[[556,611],[482,550],[594,467]],[[613,611],[596,548],[585,463]]],"w":[31,20,20]}
wh = wh.replace(
    '"Jung_T2_ㅠ":{"c":"ㅠ","r":"jung","t":2,"b":[100,440,824,220],"m":[[[355,622],[514,622],[656,627]],[[556,611],[482,550],[594,467]],[[613,611],[596,548],[585,463]]],"w":[31,20,20]}',
    '"Jung_T2_ㅠ":{"c":"ㅠ","r":"jung","t":2,"b":[100,440,824,220],"m":[[[355,622],[514,622],[656,627]],[[450,615],[455,545],[445,465]],[[610,615],[605,545],[595,463]]],"w":[31,20,20]}'
);

// Fix Jung_T2_ㅗ: adjust horizontal bar so it stays centered in middle tier and doesn't spill into batchim
// Old Jung_T2_ㅗ:
// "Jung_T2_ㅗ":{"c":"ㅗ","r":"jung","t":2,"b":[100,440,824,220],"m":[[[475,650],[495,590],[513,536]],[[296,490],[513,536],[713,492]]],"w":[26,26]}
wh = wh.replace(
    '"Jung_T2_ㅗ":{"c":"ㅗ","r":"jung","t":2,"b":[100,440,824,220],"m":[[[475,650],[495,590],[513,536]],[[296,490],[513,536],[713,492]]],"w":[26,26]}',
    '"Jung_T2_ㅗ":{"c":"ㅗ","r":"jung","t":2,"b":[100,450,824,210],"m":[[[475,650],[495,590],[513,556]],[[260,556],[513,556],[750,556]]],"w":[26,26]}'
);

fs.writeFileSync('c:/project/한글획순/warehouse_centerlines.js', wh, 'utf8');
console.log('warehouse_centerlines.js updated successfully.');

console.log('--- 2. Patching index.html ---');
let html = fs.readFileSync('c:/project/한글획순/index.html', 'utf8');

// (A) Fix computeDynamicJamoBounds for horizontal vowels and compound vowels
const oldBoundsSearch = `        } else {
            let y1 = Math.round(minY + (maxY - minY) * 0.48);
            let min1 = 1e9;
            const r1Start = Math.round(minY + (maxY - minY) * 0.30);
            const r1End = Math.round(minY + (maxY - minY) * 0.62);
            for (let y = r1Start; y <= r1End; y++) {
                if (projY[y] < min1) { min1 = projY[y]; y1 = y; }
            }
            b.choY1 = minY; b.choY2 = y1;
            b.jungY1 = y1; b.jungY2 = maxY;
        }`;

const newBoundsSearch = `        } else {
            let y1 = Math.round(minY + (maxY - minY) * (info.jung === 'ㅡ' ? 0.72 : 0.48));
            let min1 = 1e9;
            const r1Start = Math.round(minY + (maxY - minY) * (info.jung === 'ㅡ' ? 0.58 : 0.35));
            const r1End = Math.round(minY + (maxY - minY) * 0.82);
            for (let y = r1Start; y <= r1End; y++) {
                if (projY[y] < min1) { min1 = projY[y]; y1 = y; }
            }
            b.choY1 = minY; b.choY2 = y1;
            b.jungY1 = y1; b.jungY2 = maxY;
        }`;

if (html.includes(oldBoundsSearch)) {
    html = html.replace(oldBoundsSearch, newBoundsSearch);
    console.log('Replaced horizontal bounds search (curing 흐).');
} else {
    // Try with CRLF
    html = html.replace(oldBoundsSearch.replace(/\n/g, '\r\n'), newBoundsSearch.replace(/\n/g, '\r\n'));
    console.log('Replaced horizontal bounds search (CRLF).');
}

// (B) Fix vType === 'C' choY2 for open syllables (희, etc.)
const oldCYCho = `        // (2) choY2: 초성(좌상)과 가로모음(좌중) 사이의 수평 분할벽 (30%~55% 범위 탐색)
        let yCho = Math.round(minY + (maxY - minY) * 0.42);
        let minYCho = 1e9;
        const ycStart = Math.round(minY + (maxY - minY) * 0.28);
        const ycEnd = Math.round(minY + (maxY - minY) * 0.55);`;

const newCYCho = `        // (2) choY2: 초성(좌상)과 가로모음(좌중) 사이의 수평 분할벽
        const isUiOpen = (!hasJong && info.jung === 'ㅢ');
        let yCho = Math.round(minY + (maxY - minY) * (isUiOpen ? 0.68 : 0.42));
        let minYCho = 1e9;
        const ycStart = Math.round(minY + (maxY - minY) * (isUiOpen ? 0.52 : 0.28));
        const ycEnd = Math.round(minY + (maxY - minY) * (isUiOpen ? 0.80 : 0.55));`;

if (html.includes(oldCYCho)) {
    html = html.replace(oldCYCho, newCYCho);
    console.log('Replaced vType C choY2 search (curing 희).');
} else {
    html = html.replace(oldCYCho.replace(/\n/g, '\r\n'), newCYCho.replace(/\n/g, '\r\n'));
    console.log('Replaced vType C choY2 search (CRLF).');
}

// (C) Fix vType === 'C' partition walls in buildGlyphData
const oldCPart = `                        } else if (jb.vType === 'C') {
                            if (jb.hasJong && mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.jongY1 - 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                if (mk.subPart === 'jung_v' && lx < jb.splitX - 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.jongY1 + 3 && lx < jb.splitX) dist += 1e7;
                            }
                        }`;

const newCPart = `                        } else if (jb.vType === 'C') {
                            if (jb.hasJong && mk.part === 'jong' && ly < jb.jongY1 - 3) dist += 1e7;
                            if (mk.part === 'cho') {
                                if (lx > jb.splitX + 3) dist += 1e7;
                                if (ly > jb.choY2 + 3) dist += 1e7;
                            } else if (mk.part === 'jung') {
                                const isVerticalJung = (mk.subPart === 'jung_v' || lx > jb.splitX - 12);
                                if (isVerticalJung && lx < jb.splitX - 3) dist += 1e7;
                                if (!isVerticalJung && ly < jb.choY2 - 3) dist += 1e7;
                                if (jb.hasJong && ly > jb.jongY1 + 3 && lx < jb.splitX) dist += 1e7;
                            }
                        }`;

if (html.includes(oldCPart)) {
    html = html.replace(oldCPart, newCPart);
    console.log('Replaced vType C partition walls in buildGlyphData (curing 확).');
} else {
    html = html.replace(oldCPart.replace(/\n/g, '\r\n'), newCPart.replace(/\n/g, '\r\n'));
    console.log('Replaced vType C partition walls in buildGlyphData (CRLF).');
}

// (D) Replace the assimilation loop with the 8-connected, max-island-preserving assimilation with fallback
const targetStart = '// 고립된 작은 조각(다른 획 사이에 박힌 점/얼룩)은 동일 자소(초·중·종성) 내 이웃 획으로 우선 재배정';
const targetEnd = 'const order = Array.from({ length: idxList.length }, (_, i) => i)';

const startIdx = html.indexOf(targetStart);
const endIdx = html.indexOf(targetEnd);

if (startIdx >= 0 && endIdx >= 0) {
    const newAssimilationCode = `// ★ 정통 8-연결성 골격 주간선 보존 및 분할 섬 동화 알고리즘:
        //   - 각 획의 최대 8-연결 컴포넌트(주간선)는 100% 영구 보존한다.
        //   - 떨어진 2차 분할 섬(Secondary Island)은 접하는 동일 자소 이웃 획으로 완벽 동화한다.
        //   - 흰 여백에 고립된 섬은 유클리드 최근접 획 골격으로 귀속하여 전수 1-아일랜드 무결성을 달성한다.
        {
            const N = idxList.length;
            const posToI = new Int32Array(W * R).fill(-1);
            for (let i = 0; i < N; i++) posToI[idxList[i]] = i;
            const partOf = (s) => (this.strokeMeta && this.strokeMeta[s]) ? this.strokeMeta[s].part : 'single';
            const K = this.strokes.length;

            for (let pass = 0; pass < 8; pass++) {
                const visited = new Uint8Array(N);
                const strokeIslands = Array.from({ length: K }, () => []);

                for (let i = 0; i < N; i++) {
                    if (visited[i]) continue;
                    const s = sidList[i];
                    const comp = [i];
                    visited[i] = 1;
                    let head = 0;
                    while (head < comp.length) {
                        const cur = comp[head++];
                        const p = idxList[cur];
                        const cx = p % W, cy = (p / W) | 0;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = cx + dx, ny = cy + dy;
                                if (nx < 0 || ny < 0 || nx >= W || ny >= R) continue;
                                const j = posToI[ny * W + nx];
                                if (j >= 0 && !visited[j] && sidList[j] === s) {
                                    visited[j] = 1;
                                    comp.push(j);
                                }
                            }
                        }
                    }
                    strokeIslands[s].push(comp);
                }

                let reassignedCount = 0;
                for (let k = 0; k < K; k++) {
                    const islands = strokeIslands[k];
                    if (islands.length <= 1) continue;
                    islands.sort((a, b) => b.length - a.length);

                    for (let islIdx = 1; islIdx < islands.length; islIdx++) {
                        const comp = islands[islIdx];
                        const ownPart = partOf(k);
                        const sameVotes = new Map(), anyVotes = new Map();
                        const ref = new Map();

                        comp.forEach(ci2 => {
                            const p = idxList[ci2];
                            const cx = p % W, cy = (p / W) | 0;
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    if (dx === 0 && dy === 0) continue;
                                    const nx = cx + dx, ny = cy + dy;
                                    if (nx < 0 || ny < 0 || nx >= W || ny >= R) continue;
                                    const j = posToI[ny * W + nx];
                                    if (j >= 0 && sidList[j] !== k) {
                                        const nbS = sidList[j];
                                        anyVotes.set(nbS, (anyVotes.get(nbS) || 0) + 1);
                                        if (partOf(nbS) === ownPart) sameVotes.set(nbS, (sameVotes.get(nbS) || 0) + 1);
                                        if (!ref.has(nbS)) ref.set(nbS, j);
                                    }
                                }
                            }
                        });

                        const targetVotes = sameVotes.size > 0 ? sameVotes : anyVotes;
                        let bestO = -1, bestV = -1;
                        if (targetVotes && targetVotes.size > 0) {
                            targetVotes.forEach((v, o) => { if (v > bestV) { bestV = v; bestO = o; } });
                        } else {
                            // 흰 여백에 고립된 섬: 동일 자소 내 최근접 획으로 귀속
                            let cX = 0, cY = 0;
                            comp.forEach(ci2 => { const p = idxList[ci2]; cX += p % W; cY += (p / W) | 0; });
                            cX /= comp.length; cY /= comp.length;
                            let minD = 1e9;
                            for (let candK = 0; candK < K; candK++) {
                                if (candK === k) continue;
                                if (partOf(candK) !== ownPart) continue;
                                const candPts = this.strokes[candK];
                                if (!candPts) continue;
                                candPts.forEach(pt => {
                                    const d = Math.hypot(cX - pt[0] * R / 100, cY - pt[1] * R / 100);
                                    if (d < minD) { minD = d; bestO = candK; }
                                });
                            }
                            if (bestO < 0) {
                                for (let candK = 0; candK < K; candK++) {
                                    if (candK === k) continue;
                                    const candPts = this.strokes[candK];
                                    if (!candPts) continue;
                                    candPts.forEach(pt => {
                                        const d = Math.hypot(cX - pt[0] * R / 100, cY - pt[1] * R / 100);
                                        if (d < minD) { minD = d; bestO = candK; }
                                    });
                                }
                            }
                        }

                        if (bestO >= 0) {
                            const pidRef = ref.has(bestO) ? pidList[ref.get(bestO)] : 0;
                            comp.forEach(ci2 => { sidList[ci2] = bestO; pidList[ci2] = pidRef; });
                            reassignedCount += comp.length;
                        }
                    }
                }
                if (reassignedCount === 0) break;
            }
        }\n        `;

    html = html.slice(0, startIdx) + newAssimilationCode + html.slice(endIdx);
    console.log('Replaced assimilation block successfully.');
} else {
    console.error('Failed to locate assimilation block delimiters:', { startIdx, endIdx });
}

fs.writeFileSync('c:/project/한글획순/index.html', html, 'utf8');
console.log('index.html saved successfully.');
