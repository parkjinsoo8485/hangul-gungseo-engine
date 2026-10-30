const fs = require('fs');

const whPath = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const wh = JSON.parse(fs.readFileSync(whPath, 'utf8'));

function parseSVGPathToPolygons(d) {
  const polys = [];
  const commands = d.match(/[a-df-z][^a-df-z]*/ig) || [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  let current = [];
  for (const cmd of commands) {
    const type = cmd[0];
    const args = (cmd.slice(1).trim().match(/[-+]?(?:\d*\.\d+|\d+)/g) || []).map(Number);
    if (type === 'M') {
      if (current.length > 0) polys.push(current);
      current = [];
      cx = args[0]; cy = args[1]; sx = cx; sy = cy;
      current.push([cx, cy]);
    } else if (type === 'L') {
      for (let i = 0; i < args.length; i += 2) {
        cx = args[i]; cy = args[i+1];
        current.push([cx, cy]);
      }
    } else if (type === 'Q') {
      for (let i = 0; i < args.length; i += 4) {
        const x1 = args[i], y1 = args[i+1], x = args[i+2], y = args[i+3];
        for (let t = 0.05; t <= 1.001; t += 0.05) {
          const mt = 1 - t;
          current.push([mt*mt*cx + 2*mt*t*x1 + t*t*x, mt*mt*cy + 2*mt*t*y1 + t*t*y]);
        }
        cx = x; cy = y;
      }
    } else if (type === 'C') {
      for (let i = 0; i < args.length; i += 6) {
        const x1 = args[i], y1 = args[i+1], x2 = args[i+2], y2 = args[i+3], x = args[i+4], y = args[i+5];
        for (let t = 0.05; t <= 1.001; t += 0.05) {
          const mt = 1 - t;
          current.push([
            mt*mt*mt*cx + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x,
            mt*mt*mt*cy + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y
          ]);
        }
        cx = x; cy = y;
      }
    } else if (type === 'Z' || type === 'z') {
      cx = sx; cy = sy;
      if (current.length > 0) { polys.push(current); current = []; }
    }
  }
  if (current.length > 0) polys.push(current);
  return polys;
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function isInsideGlyph(x, y, polys) {
  let c = 0;
  for (const p of polys) if (pointInPoly(x, y, p)) c++;
  return (c % 2) === 1;
}

function ptSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx*dx + dy*dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1)*dx + (py - y1)*dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t*dx), py - (y1 + t*dy));
}

function distToBoundary(x, y, polys) {
  let minD = Infinity;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const d = ptSegDist(x, y, x1, y1, x2, y2);
      if (d < minD) minD = d;
    }
  }
  return minD;
}

function signedClearance(x, y, polys) {
  const d = distToBoundary(x, y, polys);
  return isInsideGlyph(x, y, polys) ? d : -d;
}

// Compute exact ring medial axis around hole polygon
function buildRingMediansFromHole(polys, holePoly) {
  let cx = 0, cy = 0;
  for (const [x, y] of holePoly) { cx += x; cy += y; }
  cx /= holePoly.length;
  cy /= holePoly.length;

  const pts = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const angle = (Math.PI / 2) + (i / N) * (Math.PI * 2 * 0.96);
    const dx = Math.cos(angle), dy = Math.sin(angle);
    let rIn = null, rOut = null;
    for (let r = 2; r <= 300; r += 1) {
      const px = cx + r * dx, py = cy + r * dy;
      const ins = isInsideGlyph(px, py, polys);
      if (rIn === null && ins) rIn = r;
      else if (rIn !== null && rOut === null && !ins) { rOut = r; break; }
    }
    if (rIn !== null && rOut !== null) {
      const rMid = 0.5 * (rIn + rOut);
      pts.push([Math.round(cx + rMid * dx), Math.round(cy + rMid * dy)]);
    }
  }
  return pts;
}

// 1. Apply exact ring medians to all 14 ㅇ/ㅎ/ㄶ/ㅀ parts
const ringParts = [
  ['Cho_T1_ㅇ', 0], ['Cho_T2_ㅇ', 0], ['Cho_T3_ㅇ', 0],
  ['Cho_T1_ㅎ', 2], ['Cho_T2_ㅎ', 2], ['Cho_T3_ㅎ', 2],
  ['Jong_T1_ㅇ', 0], ['Jong_T2_ㅇ', 0],
  ['Jong_T1_ㅎ', 2], ['Jong_T2_ㅎ', 2],
  ['Jong_T1_ㄶ', 3], ['Jong_T2_ㄶ', 3],
  ['Jong_T1_ㅀ', 5], ['Jong_T2_ㅀ', 5]
];

for (const [k, sIdx] of ringParts) {
  const p = wh.parts[k];
  const polys = parseSVGPathToPolygons(p.gungsuhOutline);
  let holePoly = null;
  for (let i = 0; i < polys.length; i++) {
    let cx = 0, cy = 0;
    for (const [x, y] of polys[i]) { cx += x; cy += y; }
    cx /= polys[i].length; cy /= polys[i].length;
    let parentCount = 0;
    for (let j = 0; j < polys.length; j++) {
      if (i !== j && pointInPoly(cx, cy, polys[j])) parentCount++;
    }
    if (parentCount % 2 === 1) { holePoly = polys[i]; break; }
  }
  if (holePoly) {
    p.medians[sIdx] = buildRingMediansFromHole(polys, holePoly);
  }
}

// 2. Explicit precision trajectories aligned to gungsuhOutline slices for broken/twisted strokes
const OVERRIDES = {
  // Consonants (Cho)
  'Cho_T1_ㄱ': {
    0: [[102, 623], [280, 620], [418, 616], [428, 520], [409, 396]]
  },
  'Cho_T2_ㄱ': {
    0: [[295, 832], [510, 828], [668, 825], [685, 710], [665, 566]]
  },
  'Cho_T3_ㄱ': {
    0: [[152, 797], [327, 802], [462, 795], [466, 669], [453, 581]]
  },
  'Cho_T1_ㄲ': {
    0: [[95, 614], [180, 610], [238, 605], [241, 495], [237, 419]],
    1: [[334, 611], [385, 611], [432, 605], [436, 486], [429, 414]]
  },
  'Cho_T2_ㄲ': {
    0: [[268, 828], [390, 827], [456, 820], [463, 718], [447, 576]],
    1: [[559, 835], [640, 831], [704, 822], [715, 708], [707, 582]]
  },
  'Cho_T3_ㄲ': {
    1: [[326, 810], [409, 812], [478, 804], [474, 670], [468, 596]]
  },
  'Cho_T1_ㄸ': {
    1: [[156, 565], [156, 500], [162, 438], [219, 446], [278, 456]],
    3: [[335, 565], [352, 500], [362, 444], [410, 452], [452, 460]]
  },
  'Cho_T2_ㄸ': {
    3: [[570, 792], [585, 700], [595, 608], [672, 616], [767, 644]]
  },
  'Cho_T3_ㄸ': {
    3: [[348, 760], [368, 690], [382, 622], [430, 630], [477, 643]]
  },
  'Cho_T1_ㄹ': {
    0: [[102, 653], [285, 645], [405, 642], [403, 575]]
  },
  'Cho_T1_ㅁ': {
    0: [[112, 619], [159, 560], [182, 480], [191, 385]],
    1: [[210, 605], [315, 616], [408, 618], [418, 520], [416, 440]],
    2: [[195, 412], [305, 416], [420, 420]]
  },
  'Cho_T2_ㅁ': {
    1: [[460, 815], [575, 825], [648, 822], [654, 720], [651, 640]]
  },
  'Cho_T3_ㅁ': {
    0: [[153, 816], [198, 740], [210, 640], [216, 555]],
    1: [[240, 807], [358, 815], [442, 812], [456, 710], [452, 625]],
    2: [[220, 602], [335, 605], [452, 608]]
  },
  'Cho_T1_ㅂ': {
    2: [[180, 540], [275, 548], [358, 547]]
  },
  'Cho_T2_ㅂ': {
    0: [[352, 816], [392, 795], [414, 740], [422, 650], [425, 555]],
    1: [[608, 855], [645, 800], [658, 715], [662, 640], [662, 575]],
    2: [[428, 730], [510, 736], [588, 736]],
    3: [[428, 574], [540, 574], [658, 576]]
  },
  'Cho_T3_ㅂ': {
    2: [[228, 725], [315, 732], [392, 731]]
  },
  'Cho_T1_ㅅ': {
    0: [[281, 644], [312, 595], [294, 542], [250, 485], [195, 430], [130, 396]],
    1: [[310, 528], [373, 495], [420, 455], [455, 405]]
  },
  'Cho_T2_ㅅ': {
    0: [[511, 865], [552, 805], [533, 741], [480, 675], [405, 600], [315, 555]],
    1: [[545, 715], [630, 670], [695, 620], [735, 570]]
  },
  'Cho_T3_ㅅ': {
    0: [[317, 832], [350, 780], [332, 730], [290, 675], [230, 615], [160, 578]],
    1: [[340, 710], [415, 675], [465, 635], [495, 595]]
  },
  'Cho_T1_ㅆ': {
    0: [[218, 605], [230, 560], [205, 515], [168, 475], [128, 442]],
    1: [[218, 535], [255, 500], [278, 468]],
    2: [[358, 620], [385, 570], [362, 520], [312, 462], [258, 418]],
    3: [[368, 535], [418, 495], [456, 448]]
  },
  'Cho_T2_ㅆ': {
    0: [[420, 835], [445, 780], [415, 715], [358, 650], [295, 598]],
    1: [[435, 715], [482, 675], [505, 632]],
    2: [[611, 860], [658, 790], [630, 715], [560, 630], [492, 572]],
    3: [[635, 715], [705, 670], [756, 615]]
  },
  'Cho_T1_ㅈ': {
    0: [[155, 602], [300, 614], [435, 638]],
    1: [[320, 585], [317, 542], [295, 495], [245, 448], [168, 392]],
    2: [[315, 515], [385, 475], [435, 430], [456, 396]]
  },
  'Cho_T1_ㅉ': {
    0: [[142, 588], [210, 592], [268, 598]],
    1: [[226, 575], [225, 528], [192, 488], [142, 456], [105, 445]],
    2: [[222, 515], [256, 482], [275, 452]],
    3: [[315, 591], [385, 598], [438, 608]],
    4: [[384, 575], [375, 522], [338, 475], [292, 435], [264, 417]],
    5: [[375, 515], [422, 480], [452, 442]]
  },
  'Cho_T3_ㅉ': {
    0: [[172, 772], [243, 778], [302, 788]],
    1: [[261, 755], [258, 710], [225, 672], [175, 642], [138, 630]],
    2: [[258, 700], [292, 668], [312, 638]],
    3: [[350, 778], [415, 784], [472, 795]],
    4: [[421, 760], [412, 705], [373, 658], [328, 618], [294, 598]],
    5: [[412, 700], [462, 665], [492, 625]]
  },
  'Cho_T1_ㅊ': {
    0: [[255, 655], [312, 648], [365, 652]],
    1: [[160, 558], [285, 562], [425, 582]],
    2: [[322, 555], [322, 506], [295, 458], [235, 415], [158, 375]],
    3: [[322, 490], [390, 450], [448, 400]]
  },
  'Cho_T3_ㅊ': {
    0: [[291, 835], [350, 832], [405, 837]],
    1: [[195, 742], [335, 752], [475, 770]],
    2: [[358, 740], [359, 691], [332, 642], [272, 598], [192, 558]],
    3: [[359, 675], [430, 635], [488, 582]]
  },
  'Cho_T1_ㅋ': {
    0: [[107, 650], [283, 642], [412, 636], [405, 524], [397, 385]],
    1: [[102, 517], [280, 521], [415, 535]]
  },
  'Cho_T2_ㅋ': {
    0: [[335, 844], [515, 831], [642, 822], [638, 705], [628, 573]],
    1: [[330, 707], [515, 711], [645, 725]]
  },
  'Cho_T3_ㅋ': {
    0: [[133, 844], [318, 829], [448, 820], [442, 705], [435, 555]],
    1: [[128, 702], [280, 698], [440, 712]]
  },
  'Cho_T1_ㅌ': {
    2: [[224, 520], [228, 445], [242, 392], [330, 398], [458, 415]]
  },
  'Cho_T1_ㅍ': {
    0: [[125, 622], [283, 617], [432, 632]],
    1: [[201, 595], [209, 545], [221, 495], [222, 445]],
    2: [[359, 595], [378, 545], [376, 495], [369, 445]],
    3: [[105, 425], [279, 425], [462, 417]]
  },
  'Cho_T3_ㅍ': {
    0: [[156, 810], [318, 805], [468, 820]],
    1: [[235, 780], [242, 731], [255, 680], [256, 630]],
    2: [[395, 780], [417, 731], [413, 680], [407, 630]],
    3: [[125, 611], [314, 611], [495, 601]]
  },

  // Vowels (Jung)
  'Jung_T1_ㅏ': {
    0: [[615, 855], [689, 769], [694, 591], [696, 413], [693, 225]],
    1: [[695, 512], [795, 515], [905, 518]]
  },
  'Jung_T1_ㅐ': {
    0: [[615, 777], [672, 684], [675, 540], [678, 405], [671, 295]],
    1: [[676, 520], [775, 522], [875, 524]],
    2: [[805, 865], [879, 777], [878, 540], [878, 312], [870, 195]]
  },
  'Jung_T1_ㅑ': {
    0: [[615, 868], [696, 780], [699, 594], [700, 408], [693, 195]],
    1: [[700, 622], [805, 618], [912, 605]],
    2: [[700, 412], [805, 410], [912, 410]]
  },
  'Jung_T2_ㅑ': {
    0: [[662, 888], [713, 828], [714, 680], [714, 540], [706, 450]],
    1: [[714, 718], [785, 715], [854, 712]],
    2: [[714, 584], [785, 583], [852, 584]]
  },
  'Jung_T1_ㅒ': {
    0: [[612, 780], [672, 690], [675, 540], [675, 400], [662, 265]],
    1: [[675, 628], [775, 632], [872, 628]],
    2: [[675, 412], [775, 416], [872, 412]],
    3: [[805, 865], [880, 775], [880, 510], [878, 300], [862, 165]]
  },
  'Jung_T2_ㅒ': {
    0: [[665, 830], [696, 762], [696, 636], [695, 573], [691, 510]],
    1: [[696, 735], [761, 734], [830, 735]],
    2: [[695, 611], [761, 611], [830, 611]],
    3: [[789, 888], [834, 825], [832, 699], [833, 540], [827, 435]]
  },
  'Jung_T2_ㅓ': {
    0: [[656, 674], [708, 658], [760, 667], [810, 670]],
    1: [[766, 888], [815, 825], [816, 699], [818, 540], [818, 430]]
  },
  'Jung_T1_ㅔ': {
    0: [[575, 550], [655, 540], [740, 530]],
    1: [[695, 755], [741, 654], [742, 496], [736, 338]],
    2: [[818, 815], [888, 720], [887, 496], [886, 338], [870, 220]]
  },
  'Jung_T2_ㅔ': {
    0: [[615, 681], [670, 672], [738, 675]],
    1: [[720, 830], [742, 761], [743, 635], [736, 510]],
    2: [[809, 887], [858, 824], [859, 635], [858, 509], [850, 430]]
  },
  'Jung_T1_ㅗ': {
    0: [[456, 515], [495, 455], [513, 367], [517, 305]],
    1: [[212, 293], [350, 282], [515, 293], [680, 305], [812, 298]]
  },
  'Jung_T2_ㅗ': {
    0: [[481, 636], [503, 595], [513, 545], [515, 495]],
    1: [[307, 492], [417, 483], [516, 488], [637, 496], [722, 498]]
  },
  'Jung_T1_ㅘ': {
    0: [[405, 598], [435, 535], [455, 435]],
    1: [[205, 424], [320, 402], [450, 418], [563, 434], [650, 444]],
    2: [[639, 840], [711, 754], [715, 582], [714, 324], [705, 195]],
    3: [[715, 512], [800, 520], [900, 522]]
  },
  'Jung_T2_ㅘ': {
    0: [[452, 708], [472, 655], [485, 590]],
    1: [[302, 586], [385, 572], [480, 582], [564, 596], [635, 603]],
    2: [[620, 888], [669, 825], [671, 699], [671, 540], [666, 425]],
    3: [[671, 655], [735, 662], [798, 662]]
  },
  'Jung_T1_ㅙ': {
    0: [[385, 598], [415, 535], [435, 440]],
    1: [[218, 430], [325, 412], [435, 425], [566, 440]],
    2: [[628, 784], [671, 688], [671, 496], [661, 295]],
    3: [[671, 525], [740, 530], [835, 525]],
    4: [[771, 880], [850, 784], [850, 540], [849, 304], [836, 175]]
  },
  'Jung_T2_ㅙ': {
    0: [[445, 702], [462, 655], [475, 595]],
    1: [[336, 596], [410, 586], [485, 595], [564, 604]],
    2: [[608, 825], [630, 762], [630, 636], [623, 510]],
    3: [[630, 660], [685, 663], [745, 660]],
    4: [[702, 888], [748, 825], [747, 660], [746, 510], [740, 430]]
  },
  'Jung_T1_ㅚ': {
    0: [[472, 608], [502, 540], [520, 435]],
    1: [[250, 422], [368, 400], [487, 411], [605, 425], [724, 438]],
    2: [[732, 880], [817, 785], [820, 550], [818, 310], [808, 165]]
  },
  'Jung_T2_ㅚ': {
    0: [[505, 708], [522, 650], [532, 590]],
    1: [[357, 590], [435, 578], [513, 585], [617, 598], [685, 603]],
    2: [[676, 888], [727, 825], [728, 636], [726, 510], [722, 425]]
  },
  'Jung_T1_ㅛ': {
    0: [[380, 455], [395, 439], [414, 401], [423, 363], [429, 310]],
    1: [[517, 515], [548, 477], [559, 439], [562, 363], [564, 305]],
    2: [[225, 290], [365, 282], [512, 290], [665, 298], [795, 295]]
  },
  'Jung_T2_ㅛ': {
    0: [[414, 612], [434, 586], [446, 560], [451, 534], [455, 500]],
    1: [[520, 638], [540, 612], [545, 586], [547, 534], [548, 500]],
    2: [[320, 485], [420, 482], [513, 485], [620, 492], [708, 493]]
  },
  'Jung_T1_ㅜ': {
    0: [[287, 487], [385, 474], [512, 483], [635, 495], [732, 498]],
    1: [[616, 478], [615, 385], [613, 293], [602, 255]]
  },
  'Jung_T2_ㅜ': {
    0: [[362, 622], [444, 615], [526, 623], [608, 631], [662, 632]],
    1: [[583, 615], [583, 560], [582, 508], [579, 475]]
  },
  'Jung_T1_ㅝ': {
    0: [[262, 525], [380, 492], [491, 495], [635, 520]],
    1: [[491, 515], [491, 402], [464, 306], [445, 265]],
    2: [[625, 425], [715, 412], [805, 425]],
    3: [[732, 882], [814, 786], [814, 550], [813, 306], [802, 180]]
  },
  'Jung_T2_ㅝ': {
    0: [[360, 660], [445, 632], [515, 635], [605, 655]],
    1: [[510, 655], [511, 576], [492, 513], [482, 485]],
    2: [[602, 592], [658, 582], [720, 595]],
    3: [[675, 888], [723, 828], [724, 650], [723, 513], [718, 435]]
  },
  'Jung_T1_ㅞ': {
    0: [[235, 522], [345, 492], [435, 498], [548, 545]],
    1: [[432, 525], [415, 406], [382, 311], [368, 285]],
    2: [[535, 455], [605, 442], [671, 450]],
    3: [[632, 786], [671, 691], [671, 501], [671, 311], [654, 216]],
    4: [[757, 881], [836, 786], [835, 550], [832, 311], [818, 185]]
  },
  'Jung_T2_ㅞ': {
    0: [[348, 658], [415, 632], [478, 638], [545, 672]],
    1: [[475, 660], [460, 575], [435, 512]],
    2: [[542, 612], [585, 602], [630, 610]],
    3: [[610, 827], [629, 764], [629, 638], [629, 512], [618, 450]],
    4: [[690, 890], [737, 827], [738, 638], [736, 512], [729, 438]]
  },
  'Jung_T2_ㅟ': {
    0: [[362, 652], [455, 628], [545, 635], [655, 662]],
    1: [[545, 650], [533, 573], [508, 510]],
    2: [[676, 888], [723, 825], [725, 636], [728, 510], [724, 435]]
  },
  'Jung_T2_ㅠ': {
    0: [[369, 621], [449, 615], [529, 622], [609, 630], [652, 629]],
    1: [[489, 615], [482, 560], [476, 508], [462, 480]],
    2: [[592, 620], [594, 560], [596, 508], [593, 480]]
  },

  // Final Consonants (Jong)
  'Jong_T1_ㄲ': {
    1: [[516, 388], [625, 380], [692, 372], [708, 256], [699, 108]]
  },
  'Jong_T2_ㄲ': {
    1: [[524, 309], [605, 303], [652, 295], [668, 208], [660, 108]]
  },
  'Jong_T2_ㄳ': {
    0: [[318, 282], [395, 291], [442, 285], [456, 210], [452, 118]],
    1: [[603, 325], [622, 240], [585, 165], [512, 102]],
    2: [[608, 225], [648, 175], [698, 122]]
  },
  'Jong_T2_ㄷ': {
    1: [[455, 295], [432, 215], [435, 145], [526, 118], [668, 128]]
  },
  'Jong_T1_ㄹ': {
    0: [[342, 381], [508, 371], [628, 375], [629, 285]],
    1: [[365, 256], [505, 263], [645, 275]],
    2: [[432, 252], [434, 195], [442, 138], [554, 128], [664, 148]]
  },
  'Jong_T2_ㄹ': {
    0: [[385, 303], [512, 295], [602, 295], [604, 225]],
    1: [[398, 208], [510, 215], [615, 222]],
    2: [[451, 205], [452, 155], [458, 112], [546, 108], [630, 122]]
  },
  'Jong_T2_ㄺ': {
    0: [[328, 308], [411, 308], [452, 292], [445, 250], [426, 214]]
  },
  'Jong_T2_ㄻ': {
    4: [[540, 289], [614, 287], [658, 282], [668, 206], [655, 125]],
    5: [[575, 128], [635, 128], [692, 129]]
  },
  'Jong_T1_ㄼ': {
    0: [[275, 375], [385, 378], [442, 365], [442, 315], [425, 265]],
    1: [[298, 265], [385, 268], [455, 272]],
    2: [[357, 255], [357, 195], [372, 148], [435, 145], [498, 165]],
    3: [[539, 375], [568, 265], [578, 123]],
    4: [[685, 405], [712, 291], [714, 207], [695, 130]],
    5: [[568, 285], [641, 285], [712, 285]],
    6: [[578, 142], [645, 145], [705, 152]]
  },
  'Jong_T2_ㄼ': {
    0: [[335, 297], [411, 300], [455, 292], [458, 255], [442, 222]],
    1: [[345, 212], [415, 218], [468, 222]],
    2: [[393, 202], [393, 155], [405, 118], [455, 118], [502, 132]],
    3: [[535, 297], [558, 215], [566, 99]],
    4: [[648, 325], [669, 231], [671, 165], [658, 112]],
    5: [[558, 228], [615, 228], [669, 228]],
    6: [[566, 122], [617, 124], [665, 128]]
  },
  'Jong_T2_ㄽ': {
    3: [[595, 325], [622, 240], [585, 165], [518, 98]],
    4: [[605, 232], [645, 182], [688, 112]]
  },
  'Jong_T1_ㄿ': {
    0: [[268, 374], [374, 378], [434, 365], [434, 315], [418, 260]],
    1: [[275, 252], [369, 256], [458, 262]],
    2: [[341, 248], [341, 185], [358, 135], [415, 132], [465, 142]],
    3: [[512, 374], [617, 378], [716, 392]],
    4: [[547, 315], [568, 248], [578, 164]],
    5: [[677, 325], [680, 248], [679, 164]],
    6: [[512, 125], [631, 132], [748, 142]]
  },
  'Jong_T2_ㄿ': {
    0: [[327, 296], [407, 300], [452, 288], [452, 250], [435, 215]],
    1: [[338, 205], [402, 210], [468, 214]],
    2: [[381, 197], [381, 148], [395, 112], [440, 112], [478, 118]],
    3: [[518, 296], [596, 300], [672, 312]],
    4: [[543, 245], [558, 197], [565, 131]],
    5: [[643, 255], [644, 197], [643, 131]],
    6: [[511, 102], [606, 110], [692, 116]]
  },
  'Jong_T1_ㅀ': {
    0: [[300, 385], [390, 390], [450, 380], [437, 330], [430, 300]],
    1: [[295, 268], [380, 270], [452, 272]],
    2: [[366, 251], [354, 195], [368, 158], [425, 158], [488, 172]]
  },
  'Jong_T2_ㅀ': {
    0: [[350, 296], [420, 300], [470, 292], [456, 262], [452, 240]],
    1: [[352, 220], [410, 222], [462, 222]],
    2: [[391, 200], [390, 165], [400, 140], [440, 130], [484, 135]]
  },
  'Jong_T1_ㅁ': {
    0: [[328, 392], [385, 285], [408, 195], [418, 115]],
    1: [[358, 369], [510, 362], [648, 345], [658, 250], [665, 148]],
    2: [[412, 142], [535, 145], [662, 146]]
  },
  'Jong_T2_ㅁ': {
    0: [[368, 312], [418, 225], [432, 155], [439, 98]],
    1: [[385, 295], [512, 290], [618, 285], [625, 205], [632, 122]],
    2: [[435, 120], [535, 122], [628, 124]]
  },
  'Jong_T1_ㅂ': {
    0: [[355, 363], [395, 325], [415, 245], [423, 112]],
    1: [[612, 405], [645, 345], [658, 245], [662, 135]],
    2: [[418, 282], [505, 289], [582, 286]],
    3: [[425, 140], [540, 142], [658, 144]]
  },
  'Jong_T2_ㅂ': {
    0: [[385, 295], [418, 260], [435, 195], [443, 95]],
    1: [[592, 322], [615, 270], [625, 195], [628, 112]],
    2: [[438, 226], [505, 231], [568, 230]],
    3: [[445, 115], [535, 117], [625, 119]]
  },
  'Jong_T1_ㅄ': {
    0: [[295, 334], [328, 265], [338, 195], [346, 123]],
    1: [[436, 405], [465, 315], [466, 225], [463, 152]],
    2: [[335, 285], [400, 287], [465, 288]],
    3: [[342, 158], [405, 160], [463, 162]],
    4: [[615, 405], [642, 335], [625, 255], [575, 175], [528, 123]],
    5: [[632, 245], [695, 195], [748, 152]]
  },
  'Jong_T2_ㅄ': {
    0: [[348, 266], [372, 215], [378, 160], [384, 99]],
    1: [[456, 320], [478, 250], [478, 185], [474, 128]],
    2: [[375, 232], [428, 232], [478, 232]],
    3: [[382, 131], [430, 131], [474, 131]],
    4: [[595, 323], [616, 265], [602, 200], [558, 140], [520, 99]],
    5: [[608, 205], [658, 168], [698, 125]]
  },
  'Jong_T1_ㅅ': {
    0: [[555, 405], [528, 325], [475, 235], [395, 158], [308, 105]],
    1: [[515, 285], [622, 225], [738, 122]]
  },
  'Jong_T2_ㅅ': {
    0: [[547, 322], [522, 255], [478, 182], [415, 128], [352, 89]],
    1: [[497, 235], [594, 185], [688, 102]]
  },
  'Jong_T1_ㅆ': {
    0: [[422, 398], [418, 315], [375, 232], [315, 178], [265, 148]],
    1: [[425, 295], [475, 235], [498, 178]],
    2: [[638, 405], [635, 315], [595, 232], [535, 165], [482, 122]],
    3: [[638, 295], [702, 225], [752, 165]]
  },
  'Jong_T2_ㅆ': {
    0: [[444, 312], [452, 255], [412, 186], [358, 142], [326, 119]],
    1: [[452, 225], [488, 185], [506, 148]],
    2: [[610, 322], [618, 265], [575, 195], [525, 135], [482, 95]],
    3: [[612, 245], [665, 192], [712, 126]]
  },
  'Jong_T1_ㅊ': {
    0: [[495, 395], [535, 392], [572, 395]]
  },
  'Jong_T1_ㅋ': {
    0: [[333, 394], [513, 381], [635, 372], [635, 255], [626, 125]],
    1: [[328, 257], [515, 261], [642, 275]]
  },
  'Jong_T2_ㅋ': {
    0: [[380, 314], [514, 304], [608, 296], [608, 205], [599, 115]],
    1: [[372, 207], [515, 212], [615, 228]]
  },
  'Jong_T2_ㅌ': {
    2: [[435, 224], [442, 165], [458, 118], [545, 118], [642, 132]]
  }
};

for (const [k, strokeMap] of Object.entries(OVERRIDES)) {
  const p = wh.parts[k];
  if (!p) continue;
  for (const [sIdxStr, pts] of Object.entries(strokeMap)) {
    p.medians[Number(sIdxStr)] = pts;
  }
}

// 3. Universal Outline-Interior & Medial-Axis Refiner across all 153 parts
function snapPointInside(x, y, polys, minClearance = 5) {
  let bestX = x, bestY = y;
  let bestC = signedClearance(x, y, polys);
  if (bestC >= minClearance) return [Math.round(x), Math.round(y)];

  // Search spiral out to r = 40
  for (let r = 1; r <= 40; r += 1) {
    const steps = Math.max(12, r * 2);
    let foundGood = false;
    for (let s = 0; s < steps; s++) {
      const a = (s / steps) * Math.PI * 2;
      const nx = Math.round(x + r * Math.cos(a));
      const ny = Math.round(y + r * Math.sin(a));
      const c = signedClearance(nx, ny, polys);
      if (c > bestC) {
        bestC = c;
        bestX = nx;
        bestY = ny;
        if (bestC >= minClearance) foundGood = true;
      }
    }
    if (foundGood && bestC >= minClearance) break;
  }
  return [bestX, bestY];
}

function centerMidpointAlongNormal(mx, my, dx, dy, polys) {
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  // Find best point along normal within [-35..35]
  let bestT = 0, bestC = signedClearance(mx, my, polys);
  for (let t = -35; t <= 35; t += 1) {
    const px = mx + t * nx, py = my + t * ny;
    const c = signedClearance(px, py, polys);
    if (c > bestC) {
      bestC = c;
      bestT = t;
    }
  }
  const cx = Math.round(mx + bestT * nx);
  const cy = Math.round(my + bestT * ny);
  if (signedClearance(cx, cy, polys) >= 4) return [cx, cy];
  return snapPointInside(mx, my, polys, 5);
}

function segmentMinClearance(p1, p2, polys) {
  const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const steps = Math.max(2, Math.ceil(dist / 3));
  let minC = Infinity;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = p1[0] + (p2[0] - p1[0]) * t;
    const y = p1[1] + (p2[1] - p1[1]) * t;
    const c = signedClearance(x, y, polys);
    if (c < minC) minC = c;
  }
  return minC;
}

function deduplicateStroke(st) {
  const out = [];
  for (const pt of st) {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) >= 2) {
      out.push([Math.round(pt[0]), Math.round(pt[1])]);
    }
  }
  return out;
}

// Recompute strokeWidths using perpendicular ray cast (matching view_150_warehouse_gallery.html)
function computeStrokeWidths(medians, polys) {
  return medians.map(pts => {
    if (!pts || pts.length < 2) return 55;
    const widths = [];
    for (let i = 0; i < pts.length; i++) {
      const pPrev = pts[Math.max(0, i - 1)];
      const pNext = pts[Math.min(pts.length - 1, i + 1)];
      const dx = pNext[0] - pPrev[0], dy = pNext[1] - pPrev[1];
      const len = Math.hypot(dx, dy);
      if (len < 1e-3) continue;
      const nx = -dy / len, ny = dx / len;
      const [px, py] = pts[i];
      let dPos = 0, dNeg = 0;
      for (let d = 1; d <= 120; d += 2) {
        if (isInsideGlyph(px + nx * d, py + ny * d, polys)) dPos = d; else break;
      }
      for (let d = 1; d <= 120; d += 2) {
        if (isInsideGlyph(px - nx * d, py - ny * d, polys)) dNeg = d; else break;
      }
      const w = dPos + dNeg;
      if (w >= 14 && w <= 160) widths.push(w);
    }
    if (!widths.length) return 55;
    widths.sort((a, b) => a - b);
    const mid = widths[Math.floor(widths.length * 0.6)];
    return Math.max(28, Math.min(115, Math.round(mid * 1.15)));
  });
}

for (const [k, p] of Object.entries(wh.parts)) {
  const polys = parseSVGPathToPolygons(p.gungsuhOutline || '');
  if (!polys.length) continue;

  p.medians = p.medians.map((st, sIdx) => {
    let cur = deduplicateStroke(st);
    const isRing = ringParts.some(([rk, rs]) => rk === k && rs === sIdx);
    // Snap all control points inside with >= 5px clearance
    cur = cur.map(([x, y]) => snapPointInside(x, y, polys, isRing ? 3 : 5));
    cur = deduplicateStroke(cur);

    // Subdivide any segment that dips outside or close to outline boundary (up to 3 passes)
    if (!isRing) {
      for (let pass = 0; pass < 3; pass++) {
        const next = [cur[0]];
        let changed = false;
        for (let i = 0; i < cur.length - 1; i++) {
          const p1 = cur[i], p2 = cur[i + 1];
          const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
          const minC = segmentMinClearance(p1, p2, polys);
          if (segLen > 18 && minC < 1.5) {
            const mx = 0.5 * (p1[0] + p2[0]);
            const my = 0.5 * (p1[1] + p2[1]);
            const midPt = centerMidpointAlongNormal(mx, my, p2[0] - p1[0], p2[1] - p1[1], polys);
            if (
              Math.hypot(midPt[0] - p1[0], midPt[1] - p1[1]) >= 6 &&
              Math.hypot(midPt[0] - p2[0], midPt[1] - p2[1]) >= 6
            ) {
              next.push(midPt);
              changed = true;
            }
          }
          next.push(p2);
        }
        cur = deduplicateStroke(next);
        if (!changed) break;
      }

      // Smooth any remaining unintended sharp turn (cos < -0.15)
      for (let pass = 0; pass < 3; pass++) {
        let fixed = false;
        for (let i = 1; i < cur.length - 1; i++) {
          const dx1 = cur[i][0] - cur[i-1][0], dy1 = cur[i][1] - cur[i-1][1];
          const dx2 = cur[i+1][0] - cur[i][0], dy2 = cur[i+1][1] - cur[i][1];
          const l1 = Math.hypot(dx1, dy1), l2 = Math.hypot(dx2, dy2);
          if (l1 > 1 && l2 > 1 && (dx1*dx2 + dy1*dy2)/(l1*l2) < -0.15) {
            // Try removing cur[i] if segment cur[i-1]->cur[i+1] stays inside
            if (segmentMinClearance(cur[i-1], cur[i+1], polys) >= 0) {
              cur.splice(i, 1);
              fixed = true;
              break;
            } else {
              const mx = Math.round((cur[i-1][0] + cur[i+1][0]) / 2);
              const my = Math.round((cur[i-1][1] + cur[i+1][1]) / 2);
              cur[i] = snapPointInside(mx, my, polys, 4);
              fixed = true;
            }
          }
        }
        if (!fixed) break;
      }
    }
    return cur;
  });

  // Ensure box contains all medians cleanly (no clamping in warehouse_bridge.js and 0 problems in build_centerlines.js)
  const allPts = p.medians.flat();
  const minX = Math.min(...allPts.map(pt => pt[0]));
  const maxX = Math.max(...allPts.map(pt => pt[0]));
  const minY = Math.min(...allPts.map(pt => pt[1]));
  const maxY = Math.max(...allPts.map(pt => pt[1]));
  if (minX < p.box.x + 4) {
    const diff = (p.box.x + 4) - minX;
    p.box.x -= diff;
    p.box.w += diff;
  }
  if (maxX > p.box.x + p.box.w - 4) {
    p.box.w = (maxX + 4) - p.box.x;
  }
  if (minY < p.box.y + 4) {
    const diff = (p.box.y + 4) - minY;
    p.box.y -= diff;
    p.box.h += diff;
  }
  if (maxY > p.box.y + p.box.h - 4) {
    p.box.h = (maxY + 4) - p.box.y;
  }

  p.strokeWidths = computeStrokeWidths(p.medians, polys);

  // Ensure p.strokes[sIdx] matches the subpath containing medians[sIdx], or p.gungsuhOutline
  if (Array.isArray(p.strokes) && p.strokes.length > 0) {
    p.strokes = p.medians.map((m, sIdx) => {
      const curStrokeD = p.strokes[sIdx] || p.gungsuhOutline;
      const sp = parseSVGPathToPolygons(curStrokeD);
      const allInsideCur = sp.length > 0 && m.every(([x, y]) => isInsideGlyph(x, y, sp));
      if (allInsideCur) return curStrokeD;
      return p.gungsuhOutline;
    });
  }
}

// Audit all 153 parts after calibration
let outCtrlTotal = 0;
let lowRatioStrokes = 0;
let sharpTurnTotal = 0;

for (const [k, p] of Object.entries(wh.parts)) {
  const polys = parseSVGPathToPolygons(p.gungsuhOutline || '');
  p.medians.forEach((m, si) => {
    for (const [x, y] of m) {
      if (!isInsideGlyph(x, y, polys)) {
        outCtrlTotal++;
        console.log(`OUT CTRL: ${k} #${si+1} [${x},${y}]`);
      }
    }
    let tot = 0, ins = 0;
    for (let i = 0; i < m.length - 1; i++) {
      const [x1, y1] = m[i], [x2, y2] = m[i+1];
      const d = Math.hypot(x2 - x1, y2 - y1);
      const steps = Math.max(1, Math.ceil(d / 4));
      for (let s = 0; s <= steps; s++) {
        const px = x1 + (x2 - x1) * (s / steps);
        const py = y1 + (y2 - y1) * (s / steps);
        tot++;
        if (isInsideGlyph(px, py, polys)) ins++;
      }
    }
    const ratio = tot > 0 ? ins / tot : 1;
    if (ratio < 0.94) {
      lowRatioStrokes++;
      console.log(`LOW RATIO: ${k} #${si+1} ratio=${ratio.toFixed(3)} m=${JSON.stringify(m)}`);
    }
    for (let i = 1; i < m.length - 1; i++) {
      const dx1 = m[i][0] - m[i-1][0], dy1 = m[i][1] - m[i-1][1];
      const dx2 = m[i+1][0] - m[i][0], dy2 = m[i+1][1] - m[i][1];
      const l1 = Math.hypot(dx1, dy1), l2 = Math.hypot(dx2, dy2);
      if (l1 > 1 && l2 > 1) {
        const cos = (dx1*dx2 + dy1*dy2) / (l1*l2);
        if (cos < -0.15) {
          sharpTurnTotal++;
          console.log(`SHARP TURN: ${k} #${si+1} pt ${i} cos=${cos.toFixed(2)} m=${JSON.stringify(m)}`);
        }
      }
    }
  });
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total parts: ${Object.keys(wh.parts).length}`);
console.log(`Outside control points: ${outCtrlTotal}`);
console.log(`Low ratio strokes (<0.94): ${lowRatioStrokes}`);
console.log(`Sharp turns (cos<-0.15): ${sharpTurnTotal}`);

if (outCtrlTotal === 0 && lowRatioStrokes === 0 && sharpTurnTotal === 0) {
  wh.meta = wh.meta || {};
  wh.meta.calibrationVersion = '3.5-perfect-153-gungsuh-calibrated';
  wh.meta.updatedAt = new Date().toISOString();
  wh.meta.status = '100% Medial-Axis Calibrated inside Gungsuh Outline (153/153 parts, 0 outside points)';

  const jsonStr = JSON.stringify(wh, null, 2);
  const jsStr = `// Gungsuh 153-Part Canonical Warehouse (Auto-synced)\nwindow.HANGUL_150_WAREHOUSE = ${jsonStr};\n`;

  const targets = [
    ['C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json', jsonStr],
    ['C:/project/app_clone/auto_income/hangul_150_parts_warehouse.js', jsStr],
    ['C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.json', jsonStr],
    ['C:/project/app_clone/auto_income/test/hangul_150_parts_warehouse.js', jsStr]
  ];
  for (const [fPath, content] of targets) {
    fs.writeFileSync(fPath, content, 'utf8');
    console.log('Saved:', fPath);
  }
}
