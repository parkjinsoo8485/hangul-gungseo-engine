const fs = require('fs');

// We already extracted Subpath 2 of '가'
// Let's create an SVG preview where we trace the centerline of this real 'ㄱ'
// Starting head: around [180, 570]
// Top horizontal ridge: [280, 580] -> [380, 570]
// Shoulder corner: around [470, 530] -> [470, 450]
// Downward sweep: [420, 350] -> [300, 260] -> tail at [100, 180]

const kPath = "M 408 389 L 406 387 L 280 295 Q 198 233 168 214 Q 122 184 107 189 Q 79 194 64 188 Q 50 182 59 175 Q 70 167 102 170 Q 142 172 201 190 Q 259 212 306 231 Q 368 256 438 288 Q 445 293 455 296 Q 461 299 473 302 Q 498 310 507 317 Q 520 329 520 351 Q 520 371 512 389 Q 507 400 494 421 Q 479 444 473 458 Q 463 482 462 508 Q 445 573 399 604 Q 356 632 277 639 Q 213 639 167 615 Q 123 591 127 562 Q 130 535 170 524 Q 194 518 257 515 Q 303 512 324 510 Q 359 505 380 494 Q 434 468 440 442 Q 444 418 408 389 Z";

const kCenterline = [
    [150, 570],
    [260, 580],
    [370, 575],
    [455, 540], // entering shoulder
    [480, 480], // shoulder peak
    [460, 390], // descending
    [380, 310],
    [280, 245],
    [170, 195],
    [85, 178]   // tail tip
];

const polylinePoints = kCenterline.map(p => `${p[0]},${p[1]}`).join(' ');

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>초성 'ㄱ' 1획 중심선 및 클리핑 검증</title>
<style>
  body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 30px; }
  .viewer { display: flex; gap: 30px; margin-top: 20px; }
  .box { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center; }
  svg { background: #090d16; border: 1px solid #475569; border-radius: 8px; }
  button { margin-top: 15px; padding: 10px 20px; background: #38bdf8; color: #0f172a; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
  button:hover { background: #7dd3fc; }
</style>
</head>
<body>
  <h2>[작게 시작하기 검증 1] 정품 궁서체 'ㄱ' 외곽선 + 중심선 클리핑 애니메이션</h2>
  <p>폰트에서 무손실 추출한 초성 'ㄱ' 외곽선 안에서 중심선 브러시가 이동할 때 번짐이나 미채움이 있는지 확인합니다.</p>
  
  <div class="viewer">
    <div class="box">
      <h3>1. 외곽선(Cyan) + 중심선 궤적(Red)</h3>
      <svg width="350" height="350" viewBox="0 100 600 600">
        <!-- Invert Y for font coordinate system -->
        <g transform="translate(0, 750) scale(1, -1)">
          <path d="${kPath}" fill="none" stroke="#38bdf8" stroke-width="3" />
          <polyline points="${polylinePoints}" fill="none" stroke="#ef4444" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          ${kCenterline.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="#f59e0b"><title>${i+1}번 점 (${p[0]}, ${p[1]})</title></circle>`).join('')}
        </g>
      </svg>
    </div>

    <div class="box">
      <h3>2. 클리핑 마스크 먹물 칠하기 (결과물)</h3>
      <svg width="350" height="350" viewBox="0 100 600 600">
        <defs>
          <clipPath id="k-outline-clip">
            <path d="${kPath}" />
          </clipPath>
        </defs>
        <g transform="translate(0, 750) scale(1, -1)">
          <!-- Background faint outline -->
          <path d="${kPath}" fill="#1e293b" stroke="#334155" stroke-width="1" />
          
          <!-- Animated Stroke with Clip Path -->
          <g clip-path="url(#k-outline-clip)">
            <polyline id="animated-brush" points="${polylinePoints}" fill="none" stroke="#f43f5e" stroke-width="95" stroke-linecap="round" stroke-linejoin="round" />
          </g>
        </g>
      </svg>
      <br>
      <button onclick="playAnim()">애니메이션 재생</button>
    </div>
  </div>

  <script>
    const brush = document.getElementById('animated-brush');
    const totalLength = brush.getTotalLength();
    brush.style.strokeDasharray = totalLength;
    brush.style.strokeDashoffset = totalLength;

    function playAnim() {
      brush.style.transition = 'none';
      brush.style.strokeDashoffset = totalLength;
      setTimeout(() => {
        brush.style.transition = 'stroke-dashoffset 1.5s ease-in-out';
        brush.style.strokeDashoffset = '0';
      }, 50);
    }
    setTimeout(playAnim, 500);
  </script>
</body>
</html>`;

fs.writeFileSync('C:/한글획순/v2_pipeline/test_k_clip.html', html, 'utf8');
console.log('Saved inspection viewer: C:/한글획순/v2_pipeline/test_k_clip.html');
