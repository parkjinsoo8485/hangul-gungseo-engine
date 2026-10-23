const fs = require('fs');

let code = fs.readFileSync('index.html', 'utf8');

// 1. Double retraction prevention
const target1 = `                                    retractedStart[k2] = 1;\r\n                                }\r\n                            }\r\n                        }\r\n                    }\r\n                }\r\n            }\r\n\r\n            // 초성·중성·종성 영역 분리 경계 계산`;
const replace1 = `                                    retractedStart[k2] = 1;\r\n                                }\r\n                            }\r\n                        }\r\n                    }\r\n                }\r\n            }\r\n            for (let k = 0; k < K; k++) {\r\n                if (retractedStart[k] && retractedEnd[k]) {\r\n                    retractedStart[k] = 0;\r\n                    retractedEnd[k] = 0;\r\n                }\r\n            }\r\n\r\n            // 초성·중성·종성 영역 분리 경계 계산`;

if (!code.includes(target1)) {
    console.error('Target 1 not found!');
    process.exit(1);
}
code = code.replace(target1, replace1);

// 2. T-junction ownership refinement
const target2 = `if ((kB < kA && uB > 0.65) || (kB > kA && (uB < 0.35 || uB > 0.65))) {\r\n                            effN[kB] = Math.max(effN[kB], 1.38);\r\n                        }`;
const replace2 = `if ((kB < kA && uB > 0.65 && retractedEnd[kB]) || (kB > kA && uB < 0.35 && retractedStart[kB])) {\r\n                            effN[kB] = Math.max(effN[kB], 1.38);\r\n                        }`;

if (!code.includes(target2)) {
    console.error('Target 2 not found!');
    process.exit(1);
}
code = code.replace(target2, replace2);

// 3. MIN_AREA protection for small valid strokes
const target3 = `            const posToI = new Int32Array(W * R).fill(-1);\r\n            for (let i = 0; i < N; i++) posToI[idxList[i]] = i;\r\n            const seen = new Uint8Array(N);\r\n            const MIN_AREA = 160;`;
const replace3 = `            const posToI = new Int32Array(W * R).fill(-1);\r\n            for (let i = 0; i < N; i++) posToI[idxList[i]] = i;\r\n            const seen = new Uint8Array(N);\r\n            const strokeCounts = new Int32Array(this.strokes.length);\r\n            for (let i = 0; i < N; i++) strokeCounts[sidList[i]]++;\r\n            const MIN_AREA = 80;`;

if (!code.includes(target3)) {
    console.error('Target 3 not found!');
    process.exit(1);
}
code = code.replace(target3, replace3);

const target4 = `                if (comp.length >= MIN_AREA) continue;`;
const replace4 = `                if (comp.length >= MIN_AREA || comp.length >= strokeCounts[own] * 0.35) continue;`;

if (!code.includes(target4)) {
    console.error('Target 4 not found!');
    process.exit(1);
}
code = code.replace(target4, replace4);

fs.writeFileSync('index.html', code, 'utf8');
console.log('Successfully patched index.html!');
