const fs = require('fs');

const filePaths = [
  'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery.html',
  'C:/project/app_clone/auto_income/view_150_warehouse_gallery.html'
];

filePaths.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update syncHanziWriterStrokeWidth
  const oldSyncRegex = /function syncHanziWriterStrokeWidth\(\) \{[\s\S]*?\n    \}/;
  const newSync = `function syncHanziWriterStrokeWidth() {
      const box = document.getElementById('hanzi-preview-box');
      if (!box || !currentPartData) return;

      const svg = box.querySelector('svg');
      if (!svg) return;

      const allPaths = Array.from(svg.querySelectorAll('path'));
      const strokePaths = allPaths.filter(p => {
        const cp = p.getAttribute('clip-path') || '';
        const parent = p.parentNode;
        const parentHasClip = parent && parent.classList && parent.classList.contains('hw-voronoi-wrapper');
        return cp.includes('mask-') || parentHasClip;
      });

      if (strokePaths.length > 0) {
        const groupCounters = new Map();
        strokePaths.forEach((p) => {
          const layer = p.parentNode;
          const pIdx = groupCounters.get(layer) || 0;
          groupCounters.set(layer, pIdx + 1);

          const targetW = (currentPartData.strokeWidths && currentPartData.strokeWidths[pIdx]) || currentStrokeWidth || 48;
          // 외곽선 형태를 100% 빈틈없이 채우기 위한 넉넉한 충진 두께 (160~220px)
          const fillW = Math.max(160, Math.min(Math.round(targetW * 3.8), 220));
          p.setAttribute('stroke-width', String(fillW));
          p.style.strokeWidth = fillW + 'px';
          p.setAttribute('stroke-linecap', 'round');
          p.setAttribute('stroke-linejoin', 'round');
          p.style.strokeLinecap = 'round';
          p.style.strokeLinejoin = 'round';
          p.setAttribute('stroke', '#ef4444');
          p.style.stroke = '#ef4444';
        });
      }
    }`;

  if (oldSyncRegex.test(content)) {
    content = content.replace(oldSyncRegex, newSync);
    console.log('Updated syncHanziWriterStrokeWidth in ' + filePath);
  }

  // 2. Add computeExactVoronoiSpanPaths and update computeTessellatedVoronoiCells
  const oldTessRegex = /function computeTessellatedVoronoiCells\(allMedians, outlinePath = ''\) \{[\s\S]*?\n    \}/;
  const newTess = `function computeExactVoronoiSpanPaths(medians, bounds, step = 4) {
      if (!medians || medians.length <= 1) {
        return ["M -400 -400 H 1424 V 1424 H -400 Z"];
      }
      const pad = 60;
      const b = bounds || { minX: 0, maxX: 1024, minY: 0, maxY: 1024 };
      const x0 = Math.max(-200, Math.floor((b.minX - pad) / step) * step);
      const x1 = Math.min(1224, Math.ceil((b.maxX + pad) / step) * step);
      const y0 = Math.max(-200, Math.floor((b.minY - pad) / step) * step);
      const y1 = Math.min(1224, Math.ceil((b.maxY + pad) / step) * step);

      const cols = Math.round((x1 - x0) / step) + 1;
      const rows = Math.round((y1 - y0) / step) + 1;
      const K = medians.length;

      const grid = new Int32Array(cols * rows);
      for (let r = 0; r < rows; r++) {
        const py = y0 + r * step;
        for (let c = 0; c < cols; c++) {
          const px = x0 + c * step;
          let minD = Infinity;
          let bestK = 0;
          for (let k = 0; k < K; k++) {
            const d = distToPolyline(px, py, medians[k]);
            if (d < minD) {
              minD = d;
              bestK = k;
            }
          }
          grid[r * cols + c] = bestK;
        }
      }

      const cells = [];
      for (let k = 0; k < K; k++) {
        const dParts = [];
        for (let r = 0; r < rows; r++) {
          const py = y0 + r * step;
          let inSpan = false;
          let startC = 0;
          for (let c = 0; c < cols; c++) {
            const isK = grid[r * cols + c] === k;
            if (isK && !inSpan) {
              inSpan = true;
              startC = c;
            } else if (!isK && inSpan) {
              inSpan = false;
              dParts.push('M ' + (x0 + startC * step) + ' ' + py + ' H ' + (x0 + c * step) + ' V ' + (py + step) + ' H ' + (x0 + startC * step) + ' Z');
            }
          }
          if (inSpan) {
            dParts.push('M ' + (x0 + startC * step) + ' ' + py + ' H ' + (x0 + cols * step) + ' V ' + (py + step) + ' H ' + (x0 + startC * step) + ' Z');
          }
        }
        cells.push(dParts.join(' '));
      }
      return cells;
    }

    function computeTessellatedVoronoiCells(allMedians, outlinePath = '') {
      return computeExactVoronoiSpanPaths(allMedians, typeof currentPartData !== 'undefined' ? currentPartData.outlineBounds : null, 4);
    }`;

  if (oldTessRegex.test(content)) {
    content = content.replace(oldTessRegex, newTess);
    console.log('Updated computeTessellatedVoronoiCells in ' + filePath);
  }

  // 3. Update updateEditorDefs
  const oldEditorDefsRegex = /if \(totalStrokes > 1\) \{[\s\S]*?defs\.appendChild\(clipEl\);\s*\}\s*\}\s*\}/;
  const newEditorDefs = `if (totalStrokes > 1) {
        const vCells = computeExactVoronoiSpanPaths(currentPartData.medians, currentPartData.outlineBounds, 4);
        currentPartData.medians.forEach((_, sIdx) => {
          const vSpan = vCells[sIdx];
          if (vSpan) {
            const clipEl = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            clipEl.id = 'stroke-voronoi-clip-' + sIdx;
            clipEl.setAttribute('class', 'stroke-voronoi-clip');

            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', vSpan);
            clipEl.appendChild(pathEl);
            defs.appendChild(clipEl);
          }
        });
      }
    }`;

  if (oldEditorDefsRegex.test(content)) {
    content = content.replace(oldEditorDefsRegex, newEditorDefs);
    console.log('Updated updateEditorDefs in ' + filePath);
  }

  // 4. Update applyHanziChainedVoronoi
  const oldApplyVoronoiRegex = /function applyHanziChainedVoronoi\(\) \{[\s\S]*?\n    \}/;
  const newApplyVoronoi = `function applyHanziChainedVoronoi() {
      const box = document.getElementById("hanzi-preview-box");
      if (!box || !currentPartData || !currentPartData.medians) return;
      const count = currentPartData.medians.length;
      if (count <= 1) return;

      const svg = box.querySelector('svg');
      if (!svg) return;
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
      }

      // 1. 각 획별 정확한 Voronoi 스팬 클립패스 생성/갱신 (귀/꼭짓점 절삭 0%, 획 간 번짐 0%)
      const vSpanPaths = computeExactVoronoiSpanPaths(currentPartData.medians, currentPartData.outlineBounds, 4);
      for (let sIdx = 0; sIdx < count; sIdx++) {
        const dStr = vSpanPaths[sIdx];
        const clipId = 'hw-voronoi-clip-' + selectedPartId + '-' + sIdx;
        let vClip = svg.querySelector('#' + clipId);
        if (!vClip) {
          vClip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
          vClip.id = clipId;
          const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          pathEl.setAttribute('d', dStr);
          vClip.appendChild(pathEl);
          defs.appendChild(vClip);
        } else {
          let pathEl = vClip.querySelector('path');
          if (!pathEl) {
            vClip.innerHTML = '';
            pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            vClip.appendChild(pathEl);
          }
          pathEl.setAttribute('d', dStr);
        }
      }

      // 1-2. HanziWriter 네이티브 mask들에 Voronoi 클립패스 직결
      const hwMaskClips = Array.from(defs.querySelectorAll('clipPath')).filter(cp => cp.id && cp.id.startsWith('mask-'));
      hwMaskClips.forEach((cp, idx) => {
        const sIdx = idx % count;
        const clipId = 'hw-voronoi-clip-' + selectedPartId + '-' + sIdx;
        cp.setAttribute('clip-path', 'url(#' + clipId + ')');
      });
    }`;

  if (oldApplyVoronoiRegex.test(content)) {
    content = content.replace(oldApplyVoronoiRegex, newApplyVoronoi);
    console.log('Updated applyHanziChainedVoronoi in ' + filePath);
  }

  // 5. Update playPreviewAnim
  const oldPlayRegex = /let isPreviewAnimating = false;\s*function playPreviewAnim\(\) \{[\s\S]*?\n    \}/;
  const newPlay = `let isPreviewAnimating = false;

    async function playPreviewAnim() {
      if (!previewWriter || !currentPartData) return;
      if (isPreviewAnimating) return;
      isPreviewAnimating = true;

      ensureStrokeWidths(currentPartData);

      const playBtn = document.getElementById('btn-play-red-anim');
      if (playBtn) {
        playBtn.innerHTML = '🔄 애니메이션 재생 중...';
        playBtn.style.opacity = '0.8';
      }

      try {
        if (previewWriter._options) {
          previewWriter._options.strokeColor = '#ef4444';
          previewWriter._options.strokeAnimationSpeed = animSpeedMultiplier;
          previewWriter._options.delayBetweenStrokes = animStrokeDelay;
        }

        ensureMasterGungsuhOutline();
        applyHanziChainedVoronoi();
        syncHanziWriterStrokeWidth();

        await previewWriter.hideCharacter({ duration: 0 });
        syncHanziWriterStrokeWidth();

        const count = currentPartData.medians.length;
        for (let s = 0; s < count; s++) {
          await previewWriter.animateStroke(s, {
            strokeAnimationSpeed: animSpeedMultiplier,
            delayBetweenStrokes: animStrokeDelay
          });
        }

        ensureMasterGungsuhOutline();
        syncHanziWriterStrokeWidth();

        if (playBtn) {
          playBtn.innerHTML = '▶ 붉은 획 애니메이션 재생';
          playBtn.style.opacity = '1.0';
        }
        showToast('[' + selectedPartId + '] 붉은 획 획순 애니메이션 재생 완료!', 'success');
      } catch (err) {
        console.error('Animation error:', err);
        if (playBtn) {
          playBtn.innerHTML = '▶ 붉은 획 애니메이션 재생';
          playBtn.style.opacity = '1.0';
        }
      } finally {
        isPreviewAnimating = false;
      }
    }`;

  if (oldPlayRegex.test(content)) {
    content = content.replace(oldPlayRegex, newPlay);
    console.log('Updated playPreviewAnim in ' + filePath);
  }

  fs.writeFileSync(filePath, content, 'utf8');
});
console.log('All files updated successfully!');
