const fs = require('fs');
let code = fs.readFileSync('tools/audit_all_11172_super_precision.js', 'utf8');
code = code.replace(
    'const jb = (Engine.jamoBoxes && Engine.jamoBoxes[0]) || {};',
    'const jb = (Engine.dynBounds && Engine.dynBounds[0]) || (Engine.jamoBoxes && Engine.jamoBoxes[0]) || {};'
);
fs.writeFileSync('tools/audit_all_11172_super_precision.js', code);
console.log('Updated audit_all_11172_super_precision.js');
