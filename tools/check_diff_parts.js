const cp = require('child_process');
const d = cp.execSync('git diff -U1 hangul_150_parts_warehouse.json', { maxBuffer: 10*1024*1024 }).toString('utf8');
const lines = d.split('\n');
const modified = new Set();
let curId = null;

for (let line of lines) {
  if (line.includes('"id": "')) {
    curId = line.split('"id": "')[1].split('"')[0];
  }
  if ((line.startsWith('+') && !line.startsWith('+++')) || (line.startsWith('-') && !line.startsWith('---'))) {
    if (curId) modified.add(curId);
  }
}

console.log('Modified parts count:', modified.size);
console.log('Modified parts:', Array.from(modified));
