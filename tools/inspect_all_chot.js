const fs = require('fs');
const bridge = fs.readFileSync('c:/project/한글획순/warehouse_bridge.js', 'utf8');
const match = bridge.match(/choT:\s*(\{[\s\S]*?\}),/);
if (match) {
    const choT = JSON.parse(match[1]);
    console.log('Total choT overrides:', Object.keys(choT).length);
    console.log('Sample choT overrides:', Object.entries(choT).slice(0, 30));
}
