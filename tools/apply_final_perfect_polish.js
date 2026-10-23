const fs = require('fs');

// 1. Fix Jung_T1_ㅔ and Jung_T2_ㅘ in warehouse_centerlines.js
let wh = fs.readFileSync('warehouse_centerlines.js', 'utf8');

// Fix Jung_T1_ㅔ
const oldJe = `"Jung_T1_ㅔ":{"c":"ㅔ","r":"jung","t":1,"b":[550,100,390,820],"m":[[[566,553],[675,544],[766,519]],[[838,766],[854,511],[861,229]],[[831,821],[887,510],[860,205]]],"w":[32,20,20]}`;
const newJe = `"Jung_T1_ㅔ":{"c":"ㅔ","r":"jung","t":1,"b":[550,100,390,820],"m":[[[566,553],[650,544],[730,520]],[[725,830],[730,510],[735,220]],[[865,850],[870,510],[865,200]]],"w":[26,26,26]}`;

if (wh.includes(oldJe)) {
    wh = wh.replace(oldJe, newJe);
    console.log('Patched Jung_T1_ㅔ in warehouse_centerlines.js');
} else console.log('Could not find oldJe');

// Fix Jung_T2_ㅘ
const oldJwa2 = `"Jung_T2_ㅘ":{"c":"ㅘ","r":"jung","t":2,"b":[160,380,780,540],"m":[[[438,727],[434,727],[477,631]],[[315,587],[463,693],[606,599]],[[632,879],[719,636],[654,400]],[[664,651],[702,660],[792,659]]],"w":[30,30,21,21]}`;
const newJwa2 = `"Jung_T2_ㅘ":{"c":"ㅘ","r":"jung","t":2,"b":[160,380,780,540],"m":[[[450,730],[460,650],[463,615]],[[315,590],[463,610],[606,595]],[[632,879],[719,636],[654,400]],[[664,651],[702,660],[792,659]]],"w":[26,26,21,21]}`;

if (wh.includes(oldJwa2)) {
    wh = wh.replace(oldJwa2, newJwa2);
    console.log('Patched Jung_T2_ㅘ in warehouse_centerlines.js');
} else console.log('Could not find oldJwa2');

fs.writeFileSync('warehouse_centerlines.js', wh, 'utf8');

// 2. In index.html, restrict Trunk Corridor Lock to true horizontal/vertical trunks
let html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');

const oldTrunkLock = `                        // (A) 선행 관통획 kA의 몸통 픽셀은 후속 가지획 kB(kB > kA)가 침범할 수 없음
                        if (kB > kA && inCorridor && isTrunkBody) {
                            if (uB <= 0.38 || dot < 0.82) {
                                effN[kB] += 5.0; // kB가 kA의 몸통을 파먹는 것을 원천 차단
                            }
                        }`;

const newTrunkLock = `                        // (A) 선행 관통획 kA의 몸통 픽셀은 후속 가지획 kB(kB > kA)가 침범할 수 없음 (단, 수직/수평 관통 주간선에만 적용)
                        const isTrueTrunk = (Math.abs(ptx[jA]) > 0.80 || Math.abs(pty[jA]) > 0.80);
                        if (isTrueTrunk && kB > kA && inCorridor && isTrunkBody) {
                            if (uB <= 0.38 || dot < 0.82) {
                                effN[kB] += 5.0; // kB가 kA의 몸통을 파먹는 것을 원천 차단
                            }
                        }`;

if (html.includes(oldTrunkLock)) {
    html = html.replace(oldTrunkLock, newTrunkLock);
    console.log('Patched TrunkLock in index.html');
} else console.log('Could not find oldTrunkLock');

fs.writeFileSync('index.html', html.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully written index.html and warehouse_centerlines.js');
