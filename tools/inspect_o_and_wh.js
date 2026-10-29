const { spawn } = require('child_process'), fs = require('fs'), http = require('http');
const PORT = 9993;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--disable-gpu',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + process.env.TEMP + '/cdp_test_' + PORT,
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
            const wh = {};
            const parts = window.HANGUL_WH_CENTERLINES.parts;
            for (const k of Object.keys(parts)) {
                if (['Cho_T1_ㅇ','Cho_T2_ㅇ','Cho_T3_ㅇ','Cho_T4_ㅇ','Cho_T5_ㅇ','Cho_T6_ㅇ','Jung_T1_ㅔ','Jung_T2_ㅔ','Jung_T1_ㅖ','Jung_T2_ㅖ','Jung_T1_ㅓ','Jung_T2_ㅓ','Jung_T1_ㅕ','Jung_T2_ㅕ','Jung_T1_ㅐ','Jung_T1_ㅒ'].includes(k)) {
                    wh[k] = parts[k];
                }
            }
            const oChars = ['아','애','야','얘','어','에','여','예','오','와','왜','외','요','우','워','웨','위','유','으','의','이','앙','앝','엉','엤'];
            const R = 360;
            const ff = Engine.styleParams.fontFamily;
            const off = document.createElement('canvas');
            off.width = R; off.height = R;
            const ctx = off.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'normal ' + Math.round(R * 0.81) + 'px ' + ff;

            const oInfo = {};
            for (const ch of oChars) {
                Engine.loadText(ch);
                const jb = Engine.dynBounds[0];
                const choE = Engine.jamoEntries.find(e => e.part === 'cho');
                const st0 = Engine.strokes[0];
                let minX = 999, maxX = -999, minY = 999, maxY = -999;
                st0.forEach(p => {
                    if (p[0] < minX) minX = p[0];
                    if (p[0] > maxX) maxX = p[0];
                    if (p[1] < minY) minY = p[1];
                    if (p[1] > maxY) maxY = p[1];
                });

                // Measure actual ink bounds of ㅇ in the glyph!
                ctx.clearRect(0, 0, R, R);
                ctx.fillText(ch, R / 2, R / 2);
                const img = ctx.getImageData(0, 0, R, R).data;
                // Find connected component or scan left of splitX
                // Wait: for 예/에, what is the actual ink bbox of the circle ㅇ?
                // Let's find the hole of ㅇ! Every ㅇ has an inner white hole!
                // If we find the inner white hole center (holeX, holeY) and outer ring bounds around that hole, we know the exact circle geometry!
                let holeMinX = 999, holeMaxX = -999, holeMinY = 999, holeMaxY = -999;
                // Scan around expected cho center
                const expCx = Math.round((choE.fbox[0] + choE.fbox[2] * 0.5) * R / 100);
                const expCy = Math.round((choE.fbox[1] + choE.fbox[3] * 0.5) * R / 100);
                // BFS from (expCx, expCy) or near it where alpha < 50
                let seedX = expCx, seedY = expCy;
                if (img[(seedY * R + seedX) * 4 + 3] >= 50) {
                    for (let r = 1; r < 40; r++) {
                        let found = false;
                        for (let dy = -r; dy <= r; dy++) {
                            for (let dx = -r; dx <= r; dx++) {
                                if (img[((expCy + dy) * R + (expCx + dx)) * 4 + 3] < 50) {
                                    seedX = expCx + dx; seedY = expCy + dy; found = true; break;
                                }
                            }
                            if (found) break;
                        }
                        if (found) break;
                    }
                }
                // Raycast in 4 directions from (seedX, seedY) to find inner hole edges and outer ring edges!
                let inL = seedX, inR = seedX, inT = seedY, inB = seedY;
                while (inL > 0 && img[(seedY * R + inL) * 4 + 3] < 80) inL--;
                while (inR < R - 1 && img[(seedY * R + inR) * 4 + 3] < 80) inR++;
                while (inT > 0 && img[(inT * R + seedX) * 4 + 3] < 80) inT--;
                while (inB < R - 1 && img[(inB * R + seedX) * 4 + 3] < 80) inB++;
                const holeCx = (inL + inR) * 0.5, holeCy = (inT + inB) * 0.5;
                // Re-raycast from hole center (holeCx, holeCy)!
                inL = Math.round(holeCx); inR = Math.round(holeCx);
                inT = Math.round(holeCy); inB = Math.round(holeCy);
                const hcx = Math.round(holeCx), hcy = Math.round(holeCy);
                while (inL > 0 && img[(hcy * R + inL) * 4 + 3] < 80) inL--;
                while (inR < R - 1 && img[(hcy * R + inR) * 4 + 3] < 80) inR++;
                while (inT > 0 && img[(inT * R + hcx) * 4 + 3] < 80) inT--;
                while (inB < R - 1 && img[(inB * R + hcx) * 4 + 3] < 80) inB++;

                let outL = inL, outR = inR, outT = inT, outB = inB;
                while (outL > 0 && img[(hcy * R + outL) * 4 + 3] >= 80) outL--;
                while (outR < R - 1 && img[(hcy * R + outR) * 4 + 3] >= 80) outR++;
                while (outT > 0 && img[(outT * R + hcx) * 4 + 3] >= 80) outT--;
                while (outB < R - 1 && img[(outB * R + hcx) * 4 + 3] >= 80) outB++;

                // Ideal centerline of the ring: midpoint between inner edge and outer edge on all 4 sides!
                const idealL = ((inL + outL) * 0.5) * 100 / R;
                const idealR = ((inR + outR) * 0.5) * 100 / R;
                const idealT = ((inT + outT) * 0.5) * 100 / R;
                const idealB = ((inB + outB) * 0.5) * 100 / R;

                oInfo[ch] = {
                    whId: choE.whId,
                    box: choE.box.map(v => Number(v.toFixed(1))),
                    fbox: choE.fbox.map(v => Number(v.toFixed(1))),
                    so: choE.so[0].map(v => Number(v.toFixed(1))),
                    curRingBbox: [Number(minX.toFixed(1)), Number(minY.toFixed(1)), Number(maxX.toFixed(1)), Number(maxY.toFixed(1))],
                    idealRingBbox: [Number(idealL.toFixed(1)), Number(idealT.toFixed(1)), Number(idealR.toFixed(1)), Number(idealB.toFixed(1))],
                    outerRingBbox: [Number((outL*100/R).toFixed(1)), Number((outT*100/R).toFixed(1)), Number((outR*100/R).toFixed(1)), Number((outB*100/R).toFixed(1))]
                };
            }
            return JSON.stringify({ wh, oInfo });
        })()`,
        returnByValue: true
    });

    const data = JSON.parse(res.result.value);
    console.log('=== Cho_T*_ㅇ & Jung WH ===');
    for (const k of Object.keys(data.wh)) {
        console.log(k, 'b:', JSON.stringify(data.wh[k].b), 'm:', JSON.stringify(data.wh[k].m));
    }
    console.log('\n=== ㅇ RING ALIGNMENT ===');
    for (const [ch, info] of Object.entries(data.oInfo)) {
        const dL = (info.curRingBbox[0] - info.idealRingBbox[0]).toFixed(1);
        const dT = (info.curRingBbox[1] - info.idealRingBbox[1]).toFixed(1);
        const dR = (info.curRingBbox[2] - info.idealRingBbox[2]).toFixed(1);
        const dB = (info.curRingBbox[3] - info.idealRingBbox[3]).toFixed(1);
        console.log(`${ch} (${info.whId}): cur=[${info.curRingBbox}] ideal=[${info.idealRingBbox}] err=[dL:${dL}, dT:${dT}, dR:${dR}, dB:${dB}] fbox=[${info.fbox}] so=[${info.so}]`);
    }

    ws.close();
    chrome.kill();
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
