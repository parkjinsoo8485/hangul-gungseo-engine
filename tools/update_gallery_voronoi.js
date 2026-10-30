const fs = require('fs');
const filePath = 'c:/project/app_clone/auto_income/view_150_warehouse_gallery.html';
let content = fs.readFileSync(filePath, 'utf8');

const target1 = 'return; // 외곽선(회색 배경) 파편화 방지: HanziWriter 고유 마스크 렌더링 보존';
console.log('Target1 found:', content.includes(target1));

if (content.includes(target1)) {
  content = content.replace(target1, '// Voronoi 체이닝 마스크 활성화 (100% 번짐 차단)');
}

const target2 = 'function applyHanziChainedVoronoi() {\r\n      // Voronoi 체이닝 마스크 활성화 (100% 번짐 차단)\r\n      if (!box || !currentPartData || !currentPartData.medians) return;';
const target2LF = 'function applyHanziChainedVoronoi() {\n      // Voronoi 체이닝 마스크 활성화 (100% 번짐 차단)\n      if (!box || !currentPartData || !currentPartData.medians) return;';

if (content.includes('if (!box || !currentPartData || !currentPartData.medians) return;')) {
  content = content.replace(
    'if (!box || !currentPartData || !currentPartData.medians) return;',
    'const box = document.getElementById("hanzi-preview-box");\n      if (!box || !currentPartData || !currentPartData.medians) return;'
  );
  console.log('Box variable added!');
}

// HanziWriter mask 체이닝 로직 보강
const vClipLoop = `      // 1. 각 획별 Voronoi 클립패스 생성/갱신
      for (let sIdx = 0; sIdx < count; sIdx++) {
        const vPoly = computeStrokeVoronoiPolygon(sIdx, currentPartData.medians);
        const clipId = \`hw-voronoi-clip-\${selectedPartId}-\${sIdx}\`;
        const ptsStr = vPoly.map(pt => \`\${pt[0].toFixed(1)},\${pt[1].toFixed(1)}\`).join(' ');
        let vClip = document.getElementById(clipId);
        if (!vClip) {
          vClip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
          vClip.id = clipId;
          const polyEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          polyEl.setAttribute('points', ptsStr);
          vClip.appendChild(polyEl);
          defs.appendChild(vClip);
        } else {
          const polyEl = vClip.querySelector('polygon');
          if (polyEl) polyEl.setAttribute('points', ptsStr);
        }
      }`;

const vClipLoopReplacement = `      // 1. 각 획별 Voronoi 클립패스 생성/갱신
      for (let sIdx = 0; sIdx < count; sIdx++) {
        const vPoly = computeStrokeVoronoiPolygon(sIdx, currentPartData.medians);
        const clipId = \`hw-voronoi-clip-\${selectedPartId}-\${sIdx}\`;
        const ptsStr = vPoly.map(pt => \`\${pt[0].toFixed(1)},\${pt[1].toFixed(1)}\`).join(' ');
        let vClip = svg.querySelector(\`#\${clipId}\`);
        if (!vClip) {
          vClip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
          vClip.id = clipId;
          const polyEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          polyEl.setAttribute('points', ptsStr);
          vClip.appendChild(polyEl);
          defs.appendChild(vClip);
        } else {
          const polyEl = vClip.querySelector('polygon');
          if (polyEl) polyEl.setAttribute('points', ptsStr);
        }
      }

      // 1-2. HanziWriter 네이티브 mask들에 Voronoi 클립패스 직결
      const hwMaskClips = Array.from(defs.querySelectorAll('clipPath')).filter(cp => cp.id && cp.id.startsWith('mask-'));
      hwMaskClips.forEach((cp, idx) => {
        const sIdx = idx % count;
        const clipId = \`hw-voronoi-clip-\${selectedPartId}-\${sIdx}\`;
        cp.setAttribute('clip-path', \`url(#\${clipId})\`);
      });`;

// 정규화하여 치환
content = content.replace(
  /for \(let sIdx = 0; sIdx < count; sIdx\+\+\) \{[\s\S]*?defs\.appendChild\(vClip\);[\s\S]*?\}[\s\S]*?\}\s*\}\s*\/\/\s*2\.\s*HanziWriter/,
  vClipLoopReplacement + '\n\n      // 2. HanziWriter'
);

// updateHanziPreview 및 playPreviewAnim 내에 applyHanziChainedVoronoi 호출 추가
if (!content.includes('applyHanziChainedVoronoi();\n            // 실시간 검증을 위해') && !content.includes('applyHanziChainedVoronoi();\r\n            // 실시간 검증을 위해')) {
  content = content.replace(
    /syncHanziWriterStrokeWidth\(\);(\r?\n\s*\/\/\s*실시간 검증)/,
    'syncHanziWriterStrokeWidth();\n            applyHanziChainedVoronoi();$1'
  );
  console.log('Hooked applyHanziChainedVoronoi into charDataLoader');
}

if (!content.includes('applyHanziChainedVoronoi();\n\n      // 획순에 맞게') && !content.includes('applyHanziChainedVoronoi();\r\n\r\n      // 획순에 맞게')) {
  content = content.replace(
    /syncHanziWriterStrokeWidth\(\);(\r?\n\s*\/\/\s*획순에 맞게)/,
    'syncHanziWriterStrokeWidth();\n      applyHanziChainedVoronoi();$1'
  );
  console.log('Hooked applyHanziChainedVoronoi into playPreviewAnim');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Gallery html update complete!');
