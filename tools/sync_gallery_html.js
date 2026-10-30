const fs = require('fs');

const rootHtml = 'C:/project/app_clone/auto_income/view_150_warehouse_gallery.html';
const testHtml = 'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery.html';

let content = fs.readFileSync(rootHtml, 'utf8');

// 디버그 로그 제거하고 정돈된 완벽한 applyHanziChainedVoronoi
const cleanChainedFunc = `    // HanziWriter의 각 획별 실제 드로잉 패스를 개별 Voronoi 클립패스로 감싸 획 간 번짐 100% 원천 차단
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

      // 1. 각 획별 Voronoi 클립패스 생성/갱신 (HanziWriter 좌표계)
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

      // 1-2. HanziWriter 네이티브 mask(clipPath[id^="mask-"])들에 Voronoi 클립패스 직결 (W3C SVG 1.1 표준 체이닝)
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

      // 3. MutationObserver 연결: HanziWriter 비동기 렌더링 중 mask 생성/교체 시 100% 즉시 자동 체이닝
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

// 함수 교체
content = content.replace(
  / \/\/ HanziWriter의 각 획별 실제 드로잉 패스를 개별 Voronoi 클립패스로 감싸 획 간 번짐 100% 원천 차단[\s\S]*? \/\/ 2\. HanziWriter의 각 획 실제 스트로크 드로잉 패스를 Voronoi 래퍼 그룹으로 감싸기[\s\S]*? \}\s*\}\);\s*[\s\S]*?\}\s*\}/,
  cleanChainedFunc
);

// rootHtml 및 testHtml 양쪽 저장
fs.writeFileSync(rootHtml, content, 'utf8');
fs.writeFileSync(testHtml, content, 'utf8');

console.log('Synchronized view_150_warehouse_gallery.html to both root and test directory!');
