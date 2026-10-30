const fs = require('fs');

const filePaths = [
  'C:/project/app_clone/auto_income/test/view_150_warehouse_gallery.html',
  'C:/project/app_clone/auto_income/view_150_warehouse_gallery.html'
];

filePaths.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  
  let startIdx = -1, endIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('if (totalStrokes > 1) {') && lines[i+1] && lines[i+1].includes('computeTessellatedVoronoiCells')) {
      startIdx = i;
      for (let j = i; j < i + 25; j++) {
        if (lines[j].trim() === '}' && lines[j+1] && lines[j+1].trim() === '}') {
          endIdx = j;
          break;
        }
      }
      break;
    }
  }

  if (startIdx !== -1 && endIdx !== -1) {
    const replacement = [
      '      if (totalStrokes > 1) {',
      '        const vCells = computeExactVoronoiSpanPaths(currentPartData.medians, currentPartData.outlineBounds, 4);',
      '        currentPartData.medians.forEach((_, sIdx) => {',
      '          const vSpan = vCells[sIdx];',
      '          if (vSpan) {',
      '            const clipEl = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");',
      '            clipEl.id = `stroke-voronoi-clip-${sIdx}`;',
      '            clipEl.setAttribute("class", "stroke-voronoi-clip");',
      '',
      '            const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");',
      '            pathEl.setAttribute("d", vSpan);',
      '            clipEl.appendChild(pathEl);',
      '            defs.appendChild(clipEl);',
      '          }',
      '        });',
      '      }'
    ];
    lines.splice(startIdx, endIdx - startIdx + 1, ...replacement);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Successfully replaced lines in', filePath);
  } else {
    console.warn('Could not locate lines in', filePath, startIdx, endIdx);
  }
});
