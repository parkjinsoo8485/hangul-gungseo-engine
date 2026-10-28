const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Find definitions of JAMO_DB_CALLI and JAMO_DB_TEXTBOOK
const calliMatch = html.match(/const\s+JAMO_DB_CALLI\s*=\s*\{([\s\S]*?)\n\s*\};/);
const textMatch = html.match(/const\s+JAMO_DB_TEXTBOOK\s*=\s*\{([\s\S]*?)\n\s*\};/);

console.log('JAMO_DB_CALLI found?', !!calliMatch);
console.log('JAMO_DB_TEXTBOOK found?', !!textMatch);

if (calliMatch) {
    // evaluate JAMO_DB_CALLI in sandbox
    const code = 'const JAMO_DB_CALLI = {' + calliMatch[1] + '}; return JAMO_DB_CALLI;';
    const db = new Function(code)();
    console.log('JAMO_DB_CALLI keys:', Object.keys(db));
    ['ㅂ', 'ㅍ', 'ㅎ', 'ㄹ', 'ㅌ', 'ㅈ', 'ㅊ', '대', '한', '성', '공'].forEach(k => {
        if (db[k]) {
            console.log(`\nJAMO_DB_CALLI['${k}']: ${db[k].length} strokes`);
            db[k].forEach((st, i) => {
                console.log(`  stroke ${i}: start=[${st[0]}], end=[${st[st.length-1]}]`);
            });
        }
    });
}
