const fs = require('fs');
const cp = require('child_process');

const filesToFix = [
  'c:/project/한글획순/view_150_warehouse_gallery.html',
  'c:/project/한글획순/view_150_warehouse_gallery_final.html',
  'C:/project/app_clone/auto_income/view_150_warehouse_gallery.html',
  'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery.html',
  'C:/project/app_clone/auto_income/view_150_warehouse_gallery_final.html',
  'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery_final.html'
];

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');

  // Fix autoOptimizeBleedingForData structure
  const badPattern = /\/\/\s*2\.\s*다획 자소 접합부\(T자\/L자\) 분리[\s\S]*?\*\/\s*\/\/\s*3\.\s*인접 획 최소 거리 기반 안전 두께/;
  const properBlock = `// 2. 다획 자소 접합부(T자/L자) 분리
      if (partData.medians.length > 1) {
        // ★ 사용자의 수동 중심선을 보호하기 위해 중심선 좌표 변경은 건너뜁니다 (외곽선 및 두께 최적화만 적용)
        /*
        const sepRes = separateJunctionMedians(partData.medians, 16);
        if (sepRes.modifiedCount > 0) {
          partData.medians = sepRes.medians;
          modified = true;
        }
        */

        // 3. 인접 획 최소 거리 기반 안전 두께`;

  if (badPattern.test(html)) {
    html = html.replace(badPattern, properBlock);
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Fixed syntax in:', filePath);

  // Validate inline script syntax
  const scriptMatches = html.match(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/i);
  if (scriptMatches) {
    const code = scriptMatches[1];
    const testFile = 'temp_validate_' + Math.random().toString(36).slice(2) + '.js';
    fs.writeFileSync(testFile, code, 'utf8');
    try {
      cp.execSync(`node --check ${testFile}`);
      console.log('  -> Syntax check PASSED for', filePath);
    } catch (err) {
      console.error('  -> Syntax check FAILED for', filePath, err.message);
    } finally {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    }
  }
});
