const fs = require('fs');

const filesToPatch = [
  'c:/project/한글획순/view_150_warehouse_gallery.html',
  'c:/project/한글획순/view_150_warehouse_gallery_final.html',
  'C:/project/app_clone/auto_income/view_150_warehouse_gallery.html',
  'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery.html',
  'C:/project/app_clone/auto_income/view_150_warehouse_gallery_final.html',
  'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery_final.html'
];

filesToPatch.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  const isCrlf = html.includes('\r\n');

  // 1. separateJunctionsUI() 보호 가드
  if (!html.includes('만나는 지점 선 분리를 실행하면')) {
    html = html.replace(
      /function separateJunctionsUI\(\)\s*\{([\s\S]*?)if \(!currentPartData/,
      `function separateJunctionsUI() {
      if (isCenterlineLocked) {
        showToast("🔒 중심선 보호 모드가 켜져 있어 중심선이 자동 변형되지 않습니다. (상단 보호 버튼을 눌러 해제 후 실행)", "warning");
        return;
      }
      if (!confirm("⚠️ 주의: 만나는 지점 선 분리를 실행하면 수동으로 맞춘 중심선 끝점이 이동(변형)될 수 있습니다.\\n정말 실행하시겠습니까?")) {
        return;
      }
      if (!currentPartData`
    );
  }

  // 2. autoOptimizeBleedingForData 에서 medians 변형 비활성화 (사용자 수동 중심선 100% 보존)
  html = html.replace(
    /\/\/\s*2\.\s*다획 자소 접합부\(T자\/L자\) 분리[\s\S]*?if\s*\(partData\.medians\.length > 1\)\s*\{[\s\S]*?partData\.medians\s*=\s*sepRes\.medians;[\s\S]*?modified\s*=\s*true;[\s\S]*?\}/,
    `// 2. 다획 자소 접합부(T자/L자) 분리 (★ 사용자의 수동 중심선을 보호하기 위해 중심선 좌표 변경은 생략하고 외곽선/두께 최적화만 진행)
      /*
      if (partData.medians.length > 1 && !isCenterlineLocked) {
        const sepRes = separateJunctionMedians(partData.medians, 16);
        if (sepRes.modifiedCount > 0) {
          partData.medians = sepRes.medians;
          modified = true;
        }
      }
      */`
  );

  // 3. autoAlignMedianToCenter & autoAlignCurrentStroke 보호 가드
  html = html.replace(
    /function autoAlignMedianToCenter\(\)\s*\{\s*if \(!currentPartData\) return;/,
    `function autoAlignMedianToCenter() {
      if (!currentPartData) return;
      if (isCenterlineLocked) {
        showToast("🔒 중심선 보호 모드가 켜져 있어 중심선이 자동 변형되지 않습니다.", "warning");
        return;
      }
      if (!confirm("⚠️ 주의: 중심 자동 정렬을 실행하면 현재 자소의 모든 수동 수정 중심선이 외곽선 계산값으로 덮어씌워집니다.\\n정말 실행하시겠습니까?")) {
        return;
      }`
  );

  html = html.replace(
    /function autoAlignCurrentStroke\(\)\s*\{\s*if \(!currentPartData\) return;/,
    `function autoAlignCurrentStroke() {
      if (!currentPartData) return;
      if (isCenterlineLocked) {
        showToast("🔒 중심선 보호 모드가 켜져 있어 중심선이 자동 변형되지 않습니다.", "warning");
        return;
      }
      if (!confirm("⚠️ 주의: 현재 획의 수동 수정 중심선이 외곽선 계산값으로 덮어씌워집니다.\\n정말 실행하시겠습니까?")) {
        return;
      }`
  );

  if (isCrlf) {
    html = html.replace(/\r?\n/g, '\r\n');
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`[Re-patched] ${filePath}`);
});
