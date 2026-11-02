const fs = require('fs');

const files = [
  'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery.html',
  'C:/project/app_clone/auto_income/view_150_warehouse_gallery.html'
];

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. hideCharacter({ duration: 0 })
  content = content.replace(
    'previewWriter.hideCharacter();',
    'previewWriter.hideCharacter({ duration: 0 });'
  );

  // 2. default animSpeedMultiplier and animStrokeDelay
  content = content.replace(
    'let animSpeedMultiplier = 0.25; // 획 드로잉 속도 (기본: 아주 느리게 0.25x - 획 관찰에 최적화)\n    let animStrokeDelay = 800; // 획 간 대기 시간 (800ms)',
    'let animSpeedMultiplier = 0.5; // 획 드로잉 속도 (기본: 표준 0.5x - 획순 교육에 최적화)\n    let animStrokeDelay = 350; // 획 간 대기 시간 (350ms)'
  );
  content = content.replace(
    'let animSpeedMultiplier = 0.25; // 획 드로잉 속도 (기본: 아주 느리게 0.25x - 획 관찰에 최적화)\r\n    let animStrokeDelay = 800; // 획 간 대기 시간 (800ms)',
    'let animSpeedMultiplier = 0.5; // 획 드로잉 속도 (기본: 표준 0.5x - 획순 교육에 최적화)\r\n    let animStrokeDelay = 350; // 획 간 대기 시간 (350ms)'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated ' + filePath);
});
