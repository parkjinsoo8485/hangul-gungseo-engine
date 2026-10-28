const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const targetLoop = `                let best = sc(0, 0), cur = (forceShiftX !== null) ? [forceShiftX, 0] : [0, 0];
                for (let gy = -maxShiftY; gy <= maxShiftY; gy += 2) {
                    for (let gx = -maxShiftX; gx <= maxShiftX; gx += 2) {
                        const c = sc(gx, gy);
                        if (c < best - 1e-4) { best = c; cur = [gx, gy]; }
                    }
                }
                [3, 1.5, 0.75].forEach(step => {
                    for (let sweep = 0; sweep < 3; sweep++) {
                        let imp = false;
                        for (const [mx, my] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                            const nx2 = cur[0] + mx * step, ny2 = cur[1] + my * step;
                            if (Math.abs(nx2) > maxShiftX || Math.abs(ny2) > maxShiftY) continue;
                            const c = sc(nx2, ny2);
                            if (c < best - 1e-4) { best = c; cur = [nx2, ny2]; imp = true; }
                        }
                        if (!imp) break;
                    }
                });`;

const replLoop = `                let cur = [0, 0];
                if (forceShiftX !== null) {
                    cur = [forceShiftX, 0];
                } else {
                    let best = sc(0, 0);
                    for (let gy = -maxShiftY; gy <= maxShiftY; gy += 2) {
                        for (let gx = -maxShiftX; gx <= maxShiftX; gx += 2) {
                            const c = sc(gx, gy);
                            if (c < best - 1e-4) { best = c; cur = [gx, gy]; }
                        }
                    }
                    [3, 1.5, 0.75].forEach(step => {
                        for (let sweep = 0; sweep < 3; sweep++) {
                            let imp = false;
                            for (const [mx, my] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                                const nx2 = cur[0] + mx * step, ny2 = cur[1] + my * step;
                                if (Math.abs(nx2) > maxShiftX || Math.abs(ny2) > maxShiftY) continue;
                                const c = sc(nx2, ny2);
                                if (c < best - 1e-4) { best = c; cur = [nx2, ny2]; imp = true; }
                            }
                            if (!imp) break;
                        }
                    });
                }`;

if (!html.includes(targetLoop)) {
    console.error('Target loop not found!');
    process.exit(1);
}
html = html.replace(targetLoop, replLoop);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully fixed forceShiftX bypass!');
