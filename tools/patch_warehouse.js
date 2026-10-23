const fs = require('fs');
let s = fs.readFileSync('warehouse_centerlines.js', 'utf8');

const target = '"Cho_T3_ㅆ":{"c":"ㅆ","r":"cho","t":3,"b":[100,520,430,370],"m":[[[250,800],[279,767],[169,641]],[[265,685],[332,682]],[[405,820],[455,778],[279,591]],[[419,697],[458,700],[492,636]]],"w":[32,32,32,32]}';
const replace = '"Cho_T3_ㅆ":{"c":"ㅆ","r":"cho","t":3,"b":[100,520,430,370],"m":[[[250,800],[279,767],[169,641]],[[265,715],[300,685],[335,655]],[[405,820],[455,778],[279,591]],[[419,697],[458,700],[492,636]]],"w":[32,32,32,32]}';

if (!s.includes(target)) {
    console.error('Target not found!');
    process.exit(1);
}
s = s.replace(target, replace);
fs.writeFileSync('warehouse_centerlines.js', s, 'utf8');
console.log('Successfully patched warehouse_centerlines.js!');
