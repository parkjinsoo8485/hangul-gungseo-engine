const fs = require('fs');

function replaceInFile(filePath, target, replacement) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Normalize target and content CRLF to LF for matching if needed
    const useCRLF = content.includes('\r\n');
    const normContent = content.replace(/\r\n/g, '\n');
    const normTarget = target.replace(/\r\n/g, '\n');
    const normReplacement = replacement.replace(/\r\n/g, '\n');

    if (!normContent.includes(normTarget)) {
        throw new Error(`Target not found in ${filePath}`);
    }
    const idx = normContent.indexOf(normTarget);
    const newNormContent = normContent.substring(0, idx) + normReplacement + normContent.substring(idx + normTarget.length);
    const finalContent = useCRLF ? newNormContent.replace(/\n/g, '\r\n') : newNormContent;
    fs.writeFileSync(filePath, finalContent, 'utf8');
    console.log(`Successfully patched ${filePath}`);
}

module.exports = { replaceInFile };
