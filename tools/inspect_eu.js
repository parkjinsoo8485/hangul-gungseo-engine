const fs = require('fs');
const raw = JSON.parse(fs.readFileSync('C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', 'utf8'));

console.log('Jung_T1_ㅡ:', JSON.stringify(raw.parts['Jung_T1_ㅡ']));
