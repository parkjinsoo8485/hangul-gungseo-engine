const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

const oldBlock = `            const seen = new Uint8Array(N);
            const strokeCounts = new Int32Array(this.strokes.length);
            for (let i = 0; i < N; i++) strokeCounts[sidList[i]]++;
            const MIN_AREA = 250;
            const partOf = (s) => (this.strokeMeta && this.strokeMeta[s]) ? this.strokeMeta[s].part : 'single';
            for (let i0 = 0; i0 < N; i0++) {
                if (seen[i0]) continue;
                const own = sidList[i0];
                const ownPart = partOf(own);
                const comp = [i0];
                seen[i0] = 1;
                for (let h = 0; h < comp.length; h++) {
                    const p = idxList[comp[h]];
                    const cx = p % W, cy = (p / W) | 0;
                    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx2 = cx + ax, ny2 = cy + ay;
                        if (nx2 < 0 || ny2 < 0 || nx2 >= W || ny2 >= R) continue;
                        const j = posToI[ny2 * W + nx2];
                        if (j >= 0 && !seen[j] && sidList[j] === own) { seen[j] = 1; comp.push(j); }
                    }
                }
                if (comp.length >= MIN_AREA || comp.length >= strokeCounts[own] * 0.40) continue;
                const sameVotes = new Map(), anyVotes = new Map();
                const ref = new Map();
                comp.forEach(ci2 => {
                    const p = idxList[ci2];
                    const cx = p % W, cy = (p / W) | 0;
                    for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                        const nx2 = cx + ax, ny2 = cy + ay;
                        if (nx2 < 0 || ny2 < 0 || nx2 >= W || ny2 >= R) continue;
                        const j = posToI[ny2 * W + nx2];
                        if (j >= 0 && sidList[j] !== own) {
                            const nbS = sidList[j];
                            anyVotes.set(nbS, (anyVotes.get(nbS) || 0) + 1);
                            if (partOf(nbS) === ownPart) sameVotes.set(nbS, (sameVotes.get(nbS) || 0) + 1);
                            if (!ref.has(nbS)) ref.set(nbS, j);
                        }
                    }
                });
                const targetVotes = sameVotes.size > 0 ? sameVotes : (comp.length < 40 ? anyVotes : null);
                if (!targetVotes || !targetVotes.size) continue;
                let bestO = -1, bestV = -1;
                targetVotes.forEach((v, o) => { if (v > bestV) { bestV = v; bestO = o; } });
                const pidRef = pidList[ref.get(bestO)];
                comp.forEach(ci2 => { sidList[ci2] = bestO; pidList[ci2] = pidRef; });
            }`;

const newBlock = `            for (let pass = 0; pass < 2; pass++) {
                const seen = new Uint8Array(N);
                const strokeCounts = new Int32Array(this.strokes.length);
                for (let i = 0; i < N; i++) strokeCounts[sidList[i]]++;
                const partOf = (s) => (this.strokeMeta && this.strokeMeta[s]) ? this.strokeMeta[s].part : 'single';
                for (let i0 = 0; i0 < N; i0++) {
                    if (seen[i0]) continue;
                    const own = sidList[i0];
                    const ownPart = partOf(own);
                    const comp = [i0];
                    seen[i0] = 1;
                    for (let h = 0; h < comp.length; h++) {
                        const p = idxList[comp[h]];
                        const cx = p % W, cy = (p / W) | 0;
                        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                            const nx2 = cx + ax, ny2 = cy + ay;
                            if (nx2 < 0 || ny2 < 0 || nx2 >= W || ny2 >= R) continue;
                            const j = posToI[ny2 * W + nx2];
                            if (j >= 0 && !seen[j] && sidList[j] === own) { seen[j] = 1; comp.push(j); }
                        }
                    }
                    if (comp.length >= strokeCounts[own] * 0.45) continue;
                    const sameVotes = new Map(), anyVotes = new Map();
                    const ref = new Map();
                    comp.forEach(ci2 => {
                        const p = idxList[ci2];
                        const cx = p % W, cy = (p / W) | 0;
                        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                            const nx2 = cx + ax, ny2 = cy + ay;
                            if (nx2 < 0 || ny2 < 0 || nx2 >= W || ny2 >= R) continue;
                            const j = posToI[ny2 * W + nx2];
                            if (j >= 0 && sidList[j] !== own) {
                                const nbS = sidList[j];
                                anyVotes.set(nbS, (anyVotes.get(nbS) || 0) + 1);
                                if (partOf(nbS) === ownPart) sameVotes.set(nbS, (sameVotes.get(nbS) || 0) + 1);
                                if (!ref.has(nbS)) ref.set(nbS, j);
                            }
                        }
                    });
                    const targetVotes = sameVotes.size > 0 ? sameVotes : anyVotes;
                    if (!targetVotes || !targetVotes.size) continue;
                    let bestO = -1, bestV = -1;
                    targetVotes.forEach((v, o) => { if (v > bestV) { bestV = v; bestO = o; } });
                    const pidRef = pidList[ref.get(bestO)];
                    comp.forEach(ci2 => { sidList[ci2] = bestO; pidList[ci2] = pidRef; });
                }
            }`;

if (html.includes(oldBlock)) {
    html = html.replace(oldBlock, newBlock);
    console.log('Patched island cleanup block in buildGlyphData');
    fs.writeFileSync('index.html', html.replace(/\n/g, '\r\n'), 'utf8');
} else {
    console.log('Could not find oldBlock');
}
