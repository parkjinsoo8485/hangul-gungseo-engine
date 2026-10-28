const fs = require('fs');

global.window = global;
require('../warehouse_centerlines.js');

const parts = HANGUL_WH_CENTERLINES.parts;

// Let's inspect all parts
console.log('Total warehouse parts:', Object.keys(parts).length);

// What parts exist for each role?
const byRole = { cho: [], jung: [], jong: [] };
for (const [id, p] of Object.entries(parts)) {
    byRole[p.r] = byRole[p.r] || [];
    byRole[p.r].push({ id, char: p.c, type: p.t, strokes: p.m.length });
}

console.log('Cho parts:', byRole.cho.length);
console.log('Jung parts:', byRole.jung.length);
console.log('Jong parts:', byRole.jong.length);

// Show unique characters for each role
console.log('Unique Cho chars:', [...new Set(byRole.cho.map(p => p.char))]);
console.log('Unique Jung chars:', [...new Set(byRole.jung.map(p => p.char))]);
console.log('Unique Jong chars:', [...new Set(byRole.jong.map(p => p.char))]);
