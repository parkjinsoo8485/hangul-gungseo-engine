const fs = require('fs');
const filePath = 'c:/project/app_clone/auto_income/view_150_warehouse_gallery.html';
let content = fs.readFileSync(filePath, 'utf8');

// MutationObserver 기반 자동 체이닝 로직 추가
const oldFuncStart = '    // HanziWriter의 각 획별 실제 드로잉 패스를 개별 Voronoi 클립패스로 감싸 획 간 번짐 100% 원천 차단\r\n    function applyHanziChainedVoronoi() {';
const oldFuncStartLF = '    // HanziWriter의 각 획별 실제 드로잉 패스를 개별 Voronoi 클립패스로 감싸 획 간 번짐 100% 원천 차단\n    function applyHanziChainedVoronoi() {';

const newChainedLogic = `    // HanziWriter의 각 획별 실제 드로잉 패스를 개별 Voronoi 클립패스로 감싸 획 간 번짐 100% 원천 차단
    let hwMutationObserver = null;

    function applyHanziChainedVoronoi() {
      const box = document.getElementById("hanzi-preview-box");
      if (!box || !currentPartData || !currentPartData.medians) return;
      const count = currentPartData.medians.length;
      if (count <= 1) return; // 단일 획은 분할 불필요

      const svg = box.querySelector('svg');
      if (!svg) return;
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
      }

      // 1. 각 획별 Voronoi 클립패스 생성/갱신
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
      });

      // 2. HanziWriter의 각 획 실제 스트로크 드로잉 패스를 Voronoi 래퍼 그룹으로도 이중 방어
      const allPaths = Array.from(svg.querySelectorAll('path'));
      const strokePaths = allPaths.filter(p => {
        const cp = p.getAttribute('clip-path') || '';
        return cp.includes('mask-') || (cp && !cp.includes('hw-voronoi') && !cp.includes('outline'));
      });

      strokePaths.forEach((pathEl, sIdx) => {
        if (sIdx >= count) return;
        const clipId = \`hw-voronoi-clip-\${selectedPartId}-\${sIdx}\`;
        const parent = pathEl.parentNode;
        if (!parent) return;

        if (parent.classList && parent.classList.contains('hw-voronoi-wrapper')) {
          parent.setAttribute('clip-path', \`url(#\${clipId})\`);
        } else {
          const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          wrapper.setAttribute('class', 'hw-voronoi-wrapper');
          wrapper.setAttribute('clip-path', \`url(#\${clipId})\`);
          parent.insertBefore(wrapper, pathEl);
          wrapper.appendChild(pathEl);
        }
      });

      // 3. MutationObserver 연결: HanziWriter 비동기 렌더링 중 mask 생성 시 100% 즉시 자동 체이닝
      if (!hwMutationObserver) {
        hwMutationObserver = new MutationObserver(() => {
          if (!currentPartData || currentPartData.medians.length <= 1) return;
          const currDefs = svg.querySelector('defs');
          if (!currDefs) return;
          const clips = Array.from(currDefs.querySelectorAll('clipPath')).filter(cp => cp.id && cp.id.startsWith('mask-'));
          const c = currentPartData.medians.length;
          clips.forEach((cp, idx) => {
            const s = idx % c;
            const cid = \`hw-voronoi-clip-\${selectedPartId}-\${s}\`;
            if (cp.getAttribute('clip-path') !== \`url(#\${cid})\`) {
              cp.setAttribute('clip-path', \`url(#\${cid})\`);
            }
          });
        });
        hwMutationObserver.observe(svg, { childList: true, subtree: true, attributes: false });
      }
    }`;

content = content.replace(
  / \/\/ HanziWriter의 각 획별 실제 드로잉 패스를 개별 Voronoi 클립패스로 감싸 획 간 번짐 100% 원천 차단[\s\S]*? \/\/ 2\. HanziWriter의 각 획 실제 스트로크 드로잉 패스를 Voronoi 래퍼 그룹으로 감싸기[\s\S]*? \}\s*\}\);\s*\}/,
  newChainedLogic
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Installed MutationObserver in view_150_warehouse_gallery.html!');
