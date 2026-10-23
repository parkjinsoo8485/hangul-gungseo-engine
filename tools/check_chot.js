const fs = require('fs');
const bridge = fs.readFileSync('c:/project/한글획순/warehouse_bridge.js', 'utf8');
const m = bridge.match(/"꽃":\s*(\d+)/);
console.log('꽃 choT:', m ? m[0] : 'not found');
