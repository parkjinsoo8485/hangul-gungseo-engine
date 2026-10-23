const fs = require('fs');
let c = fs.readFileSync('c:/project/한글획순/warehouse_bridge.js', 'utf8');
c = c.replace('WH.pickIds = function (role, ch, vType, hasJong, forceT) {', 'WH.pickIds = function (role, ch, vType, hasJong, forceT, jungCh) {');
c = c.replace("info.jung === 'ㅡ'", "jungCh === 'ㅡ'");
c = c.replace('WH.pickIds(role, ch, vType, hasJong, forceT)', 'WH.pickIds(role, ch, vType, hasJong, forceT, info.jung)');
fs.writeFileSync('c:/project/한글획순/warehouse_bridge.js', c, 'utf8');
console.log('Successfully patched warehouse_bridge.js');
