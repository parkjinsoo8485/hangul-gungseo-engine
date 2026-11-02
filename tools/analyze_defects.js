const fs = require('fs');
const defects = JSON.parse(fs.readFileSync('tools/super_precision_defects.json', 'utf8'));

console.log('Total defects:', defects.length);

const byType = {};
const byWhId = {};
const byCharSample = {};

defects.forEach(d => {
    byType[d.type] = (byType[d.type] || 0) + 1;
    byWhId[d.whId] = (byWhId[d.whId] || 0) + 1;
    if (!byCharSample[d.whId]) byCharSample[d.whId] = [];
    if (byCharSample[d.whId].length < 5) byCharSample[d.whId].push(d.char);
});

console.log('By defect type:', byType);
console.log('\nTop 15 defect whIds:');
Object.entries(byWhId)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([whId, count]) => {
        console.log(`  ${whId}: ${count} (samples: ${byCharSample[whId].join(', ')})`);
    });
