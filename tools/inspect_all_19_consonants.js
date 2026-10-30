const { spawn } = require('child_process'), http = require('http');
const PORT = 9981;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_cons_' + PORT,
    'about:blank'
], { stdio: 'ignore' });

const get = u => new Promise((res, rej) => http.get(u, r => {
    let b = ''; r.on('data', d => b += d); r.on('end', () => res(b));
}).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    let list;
    for (let i = 0; i < 40; i++) {
        try { list = JSON.parse(await get('http://127.0.0.1:' + PORT + '/json/list')); if (list && list.length) break; } catch (e) { }
        await sleep(250);
    }
    const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
    let id = 1;
    const send = (m, p = {}) => new Promise((res, rej) => {
        const reqId = id++;
        const onMsg = ({ data }) => {
            const r = JSON.parse(data);
            if (r.id === reqId) { ws.removeEventListener('message', onMsg); if (r.error) rej(r.error); else res(r.result); }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id: reqId, method: m, params: p }));
    });
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Page.navigate', { url: 'http://localhost:8080/index.html' });

    for (let i = 0; i < 50; i++) {
        try {
            const chk = await send('Runtime.evaluate', { expression: 'typeof Engine !== "undefined" && !!Engine.loadText' });
            if (chk.result && chk.result.value) break;
        } catch (e) { }
        await sleep(200);
    }

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const consonants = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ','ㄲ','ㄸ','ㅃ','ㅆ','ㅉ'];
            const R = 360;
            const ff = Engine.styleParams.fontFamily;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;

            function inspectChar(ch) {
                Engine.loadText(ch);
                ctx.clearRect(0, 0, R, R);
                ctx.fillText(ch, R / 2, R / 2);
                const img = ctx.getImageData(0, 0, R, R).data;
                const g = Engine.glyphData;
                const K = Engine.strokes.length;

                // Future bleed check
                let futureBleed = 0;
                const strokeCorePixels = Array.from({ length: K }, () => []);
                if (g) {
                    for (let i = 0; i < g.key.length; i++) {
                        const sIdx = Math.floor(g.key[i] / 4096);
                        const p = g.idx[i];
                        const px = p % R, py = Math.floor(p / R);
                        let minOtherDist = 1e9;
                        for (let oS = 0; oS < K; oS++) {
                            if (oS === sIdx) continue;
                            const oPts = Engine.strokes[oS];
                            for (let pi = 0; pi < oPts.length; pi++) {
                                const qx = oPts[pi][0] * R / 100, qy = oPts[pi][1] * R / 100;
                                const d = Math.hypot(px - qx, py - qy);
                                if (d < minOtherDist) minOtherDist = d;
                            }
                        }
                        if (minOtherDist >= 6.0) strokeCorePixels[sIdx].push(g.key[i]);
                    }
                    for (let s = 0; s < K - 1; s++) {
                        const pts = Engine.strokes[s];
                        const steps = [0, Math.floor(pts.length / 2), pts.length];
                        for (const step of steps) {
                            const maxKey = s * 4096 + (step <= 0 ? 0 : step + 1);
                            for (let futS = s + 1; futS < K; futS++) {
                                for (let f = 0; f < strokeCorePixels[futS].length; f++) {
                                    if (strokeCorePixels[futS][f] <= maxKey) futureBleed++;
                                }
                            }
                        }
                    }
                }

                // Islands check per stroke
                const strokeIslandsCount = new Array(K).fill(0);
                if (g) {
                    const N = g.idx.length;
                    const posToI = new Int32Array(R * R).fill(-1);
                    for (let i = 0; i < N; i++) posToI[g.idx[i]] = i;
                    const visited = new Uint8Array(N);
                    for (let i = 0; i < N; i++) {
                        if (visited[i]) continue;
                        const s = g.sid[i];
                        strokeIslandsCount[s]++;
                        const comp = [i];
                        visited[i] = 1;
                        let head = 0;
                        while (head < comp.length) {
                            const cur = comp[head++];
                            const p = g.idx[cur];
                            const cx = p % R, cy = (p / R) | 0;
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    if (dx === 0 && dy === 0) continue;
                                    const nx = cx + dx, ny = cy + dy;
                                    if (nx < 0 || ny < 0 || nx >= R || ny >= R) continue;
                                    const j = posToI[ny * R + nx];
                                    if (j >= 0 && !visited[j] && g.sid[j] === s) {
                                        visited[j] = 1;
                                        comp.push(j);
                                    }
                                }
                            }
                        }
                    }
                }

                const strokes = Engine.strokes.map((pts, s) => {
                    let onInk = 0;
                    pts.forEach(p => {
                        const rx = Math.round(p[0] * R / 100), ry = Math.round(p[1] * R / 100);
                        let found = false;
                        for (let dy = -2; dy <= 2 && !found; dy++) {
                            for (let dx = -2; dx <= 2; dx++) {
                                if (dx*dx + dy*dy > 4) continue;
                                const x = rx + dx, y = ry + dy;
                                if (x >= 0 && x < R && y >= 0 && y < R && img[(y * R + x) * 4 + 3] > 45) { found = true; break; }
                            }
                        }
                        if (found) onInk++;
                    });
                    let pxCount = 0;
                    if (g) {
                        for (let i = 0; i < g.sid.length; i++) if (g.sid[i] === s) pxCount++;
                    }
                    const pMid = pts[Math.floor(pts.length / 2)];
                    return {
                        s: s + 1,
                        part: Engine.strokeMeta[s].part,
                        whId: Engine.strokeMeta[s].whId,
                        p0: [Number(pts[0][0].toFixed(1)), Number(pts[0][1].toFixed(1))],
                        pMid: [Number(pMid[0].toFixed(1)), Number(pMid[1].toFixed(1))],
                        p1: [Number(pts[pts.length - 1][0].toFixed(1)), Number(pts[pts.length - 1][1].toFixed(1))],
                        len: Number(Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]).toFixed(1)),
                        onInkRatio: Number((onInk / pts.length).toFixed(2)),
                        pxCount,
                        islands: strokeIslandsCount[s]
                    };
                });
                return { ch, futureBleed, strokes };
            }

            const singleRes = consonants.map(c => inspectChar(c));
            const syllableRes = {};
            for (const c of consonants) {
                const cIdx = CHO_LIST.indexOf(c);
                // Test with ㅏ(0), ㅗ(8), ㅜ(13), ㅡ(18), ㅣ(20) and with jong ㄱ(1)
                const syls = [
                    String.fromCharCode(0xAC00 + (cIdx * 21 + 0) * 28 + 0),  // 가
                    String.fromCharCode(0xAC00 + (cIdx * 21 + 8) * 28 + 0),  // 고
                    String.fromCharCode(0xAC00 + (cIdx * 21 + 13) * 28 + 0), // 구
                    String.fromCharCode(0xAC00 + (cIdx * 21 + 0) * 28 + 1),  // 각
                    String.fromCharCode(0xAC00 + (cIdx * 21 + 8) * 28 + 1),  // 곡
                ];
                syllableRes[c] = syls.map(s => inspectChar(s));
            }
            return JSON.stringify({ singleRes, syllableRes });
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    console.log('=== 1. STANDALONE 19 CONSONANTS (단독 자음 ㄱ~ㅉ) ===');
    for (const r of data.singleRes) {
        const stStr = r.strokes.map(st => {
            const flag = (st.onInkRatio < 0.85 || st.pxCount < 50 || st.islands > 1) ? '⚠️' : '';
            return `${flag}#${st.s}:[${st.p0}]->[${st.pMid}]->[${st.p1}](ink:${st.onInkRatio},px:${st.pxCount},isl:${st.islands})`;
        }).join(' | ');
        console.log(`  ${r.ch} (bleed:${r.futureBleed}): ${stStr}`);
    }

    console.log('\n=== 2. SYLLABLES BY INITIAL CONSONANT (초성 19종 대표 음절) ===');
    for (const [c, list] of Object.entries(data.syllableRes)) {
        console.log(`\n--- Consonant ${c} ---`);
        for (const r of list) {
            const choStrokes = r.strokes.filter(st => st.part === 'cho');
            const stStr = choStrokes.map(st => {
                const flag = (st.onInkRatio < 0.85 || st.pxCount < 40 || st.islands > 1) ? '⚠️' : '';
                return `${flag}#${st.s}:[${st.p0}]->[${st.p1}](ink:${st.onInkRatio},px:${st.pxCount},isl:${st.islands})`;
            }).join(' | ');
            console.log(`  ${r.ch} (bleed:${r.futureBleed}): ${stStr}`);
        }
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
