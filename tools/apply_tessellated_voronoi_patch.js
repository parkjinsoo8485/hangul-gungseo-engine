const fs = require('fs');

const files = [
  'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery.html',
  'C:/project/app_clone/auto_income/view_150_warehouse_gallery.html'
];

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace renderSw block in renderEditor
  const targetRegex = /let renderSw;\r?\n\s+if \(totalStrokes > 1\) \{\r?\n\s+\/\/ 다획 자소: 인접 획 침범\/번짐을 원천 차단하기 위해 안전 두께\(최대 42px\)로 정밀 클램핑\r?\n\s+renderSw = useMaskClip \? Math\.min\(sw, 42\) : sw;\r?\n\s+\} else \{\r?\n\s+renderSw = useMaskClip \? Math\.max\(sw \* 1\.6, 80\) : sw;\r?\n\s+\}/;

  const newRenderSw = `let renderSw;
          if (totalStrokes > 1) {
            // 보로노이 분할에 의해 획간 침범이 원천 차단되므로 외곽선을 100% 꽉 채우는 여유 두께 적용
            renderSw = useMaskClip ? Math.max(160, Math.min(Math.round(sw * 3.0), 220)) : sw;
          } else {
            renderSw = useMaskClip ? Math.max(160, Math.min(Math.round(sw * 3.0), 220)) : sw;
          }`;

  if (targetRegex.test(content)) {
    content = content.replace(targetRegex, newRenderSw);
    console.log(`[${filePath}] renderEditor renderSw successfully replaced!`);
  } else {
    console.log(`[${filePath}] targetRegex did not match, checking content snippet...`);
  }

  // Also replace updateEditorDefs loop
  const oldVClipLoopRegex = /if \(totalStrokes > 1\) \{\r?\n\s+currentPartData\.medians\.forEach\(\(_, sIdx\) => \{\r?\n\s+const vPoly = computeStrokeVoronoiPolygon\(sIdx, currentPartData\.medians\);/;

  const newVClipLoop = `if (totalStrokes > 1) {
        const vCells = computeTessellatedVoronoiCells(currentPartData.medians);
        currentPartData.medians.forEach((_, sIdx) => {
          const vPoly = vCells[sIdx];`;

  if (oldVClipLoopRegex.test(content)) {
    content = content.replace(oldVClipLoopRegex, newVClipLoop);
    console.log(`[${filePath}] updateEditorDefs vCells loop successfully replaced!`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
});
