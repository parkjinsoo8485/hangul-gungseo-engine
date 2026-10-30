# 한글 획순 엔진 오류 수정 및 재발 방지 관리 문서 (ERROR_MANAGEMENT_LOG.md)

본 문서는 한글 궁서체(Gungseo) 11,172자 전체에 대한 **중심선(Centerline) 정렬** 및 **동영상 프레임 단위 획 번짐(Inter-stroke Bleed) / 획 끊김(Cutoff)** 오류의 근본 원인과 해결책, 그리고 코드 수정 시 절대 위반해서는 안 되는 **핵심 불변 조건(Invariants)**을 기록하여 반복 오류를 방지하기 위해 작성되었습니다.

---

## 1. 핵심 아키텍처 불변 조건 (Core Engine Invariants)

[`index.html`](file:///c:/project/한글획순/index.html) 및 [`warehouse_centerlines.js`](file:///c:/project/한글획순/warehouse_centerlines.js) 수정 시 반드시 아래 5가지 불변 조건을 준수해야 합니다.

### 불변 조건 1: 궁서체 접필 초성 6종(`ㄴ, ㄷ, ㄸ, ㄹ, ㅌ, ㅍ`)의 하단 가로획 연장 및 픽셀 소유권 보장
- **대상**: 세로형 모음(`vType === 'V'`: `ㅏ, ㅑ, ㅓ, ㅕ, ㅣ, ㅐ, ㅒ, ㅔ, ㅖ`)과 결합하는 **하단 개방형 초성 6종 (`ㄴ, ㄷ, ㄸ, ㄹ, ㅌ, ㅍ`)**.
  - ※ 주의: 닫힌 사각형 초성(`ㅁ, ㅂ, ㅃ`)은 우측 세로획이 `splitX`에서 사각형을 닫으므로 연장 대상에서 **제외**하며, `ㅋ`은 중단 가로획이므로 제외함.
- **중심선 연장 규칙 ([`index.html`](file:///c:/project/한글획순/index.html#L3530-L3615))**:
  - 초성의 마지막 획이 하단 가로획(`isChoBottomH`)인 경우, `splitX`에서 멈추지 않고 모음의 첫 번째 세로 기둥 왼쪽 경계(`firstStemX - 0.5`)까지 연장(`maxSteps = 22.0`)해야 함.
  - 궁서체 특유의 우상향 기울기(**앙세**)를 따라가도록 매 스텝마다 상하 `±6px` 범위의 잉크 세로 무게중심(`curEy`)을 추적해야 함.
  - 세로 기둥과 만나는 T자 교차점 부근에서 수직 방향 두께(`rw`)가 넓어지더라도 `firstStemX - 0.5` 도달 전까지는 T-junction 중단 조건(`rw > refW * ...`)을 우회해야 함.
- **픽셀 할당(Voronoi/Chamfer) 규칙 ([`index.html`](file:///c:/project/한글획순/index.html#L3838-L3865))**:
  - `buildGlyphData`에서 받침 유무(`jb.hasJong`)와 무관하게, 위 6종 초성의 마지막 하단 가로획(`isChoConnBottom`)은 `lx <= jb.stemX_V - 2` 영역까지 페널티(`1e7`) 없이 픽셀 소유권을 가져야 함.
  - 반대로 중성(세로 기둥 및 가로 곁줄기)은 초성 하단 가로획 영역(`lx < jb.stemX_V - 3 && ly > choMidY && ly <= jb.choY2 + 6`)을 침범하지 못하도록 `dist += 1e7` 페널티를 부여해야 함.

### 불변 조건 2: 받침 없는 글자(`!hasJong`)의 `b.choY2` 초기화 필수
- **원인**: [`computeDynamicJamoBounds`](file:///c:/project/한글획순/index.html#L1918-L1929)에서 `vType === 'V'`일 때 `if (hasJong)` 내부에서만 `b.choY2`를 설정하면, 받침 없는 글자(`나, 다, 따, 라, 타, 파` 등)에서 `jb.choY2`가 `undefined`가 되어 픽셀 할당 수식(`jb.choY2 - jb.choY1`)이 `NaN`으로 평가됨.
- **규칙**: `!hasJong`일 때도 반드시 `b.choY2 = choYBot > b.choY1 ? choYBot : maxY`로 초기화하여 `NaN` 발생을 원천 차단해야 함.

### 불변 조건 3: 세로모음 우측 곁줄기(`ㅏ, ㅑ, ㅐ, ㅒ`)의 좌측 침범 금지
- **원인**: `ㅏ, ㅑ, ㅐ, ㅒ`의 우측 짧은 가로획(곁줄기)이 역방향 연장(`pre.unshift`)될 때 세로 기둥(`firstStemX`) 왼쪽의 초성 접필 구간을 타고 넘어가면, 4번 획이 2번 획 끝에서 시작하는 오류가 발생함(예: `'닮'`).
- **규칙 ([`index.html`](file:///c:/project/한글획순/index.html#L3450-L3575))**:
  - 우측 곁줄기의 시작점 X좌표는 최소 `firstStemX - 0.2` 이상으로 클램핑해야 함.
  - 역방향 연장(`pre.unshift`) 시 `nx < firstStemX - 0.2`이면 즉시 중단(`break`)해야 함.

### 불변 조건 4: 이중모음(`ㅙ, ㅞ, ㅚ, ㅟ, ㅢ`) 곁줄기 및 다중 세로 기둥 분리
- **창고 데이터 정합성 ([`warehouse_centerlines.js`](file:///c:/project/한글획순/warehouse_centerlines.js))**:
  - `ㅙ, ㅞ`의 4번 가로획(`Jung_T1_ㅙ/ㅞ`, `Jung_T2_ㅙ/ㅞ`)은 반드시 첫 번째 세로 기둥(`X ≈ 0.59`)과 두 번째 세로 기둥(`X ≈ 0.74`) **사이**에 위치해야 하며, 두 번째 기둥 오른쪽 허공에 배치되면 안 됨.
- **첫 번째 세로 기둥(`firstStemX`) 역추적 차단 ([`index.html`](file:///c:/project/한글획순/index.html#L3570-L3580))**:
  - `ㅙ, ㅞ`의 내부 가로획이 역방향 연장(`pre.unshift`)될 때 첫 번째 세로 기둥(`firstStemX + 0.2`) 왼쪽으로 뚫고 나가지 않도록 차단해야 함.
- **개방형 초성(`ㄷ, ㅌ, ㄹ` 등)과 결합한 `ㅚ` 높이 제한 ([`index.html`](file:///c:/project/한글획순/index.html#L1940-L1970))**:
  - `'되'`와 같이 초성 우측이 열려 있는 글자에서 `choY2` 스캔이 `ㅗ`의 가로획까지 내려가지 않도록 `choRightScanX` 범위를 초성 내부로 제한하고, `ㅚ`의 우측 세로 기둥 상단이 초성 상단 높이와 조화를 이루도록 클램핑해야 함.

### 불변 조건 5: 초성 `ㄱ/ㅋ` 아래 `ㅜ/ㅠ` 및 `ㅗ/ㅘ/ㅙ/ㅚ` 세로 기둥 동적 추적 (`stemX_U`, `stemX_O`)
- **원인**: `'궁, 국, 과, 괴'` 등 초성 `ㄱ` 아래에 `ㅜ` 또는 `ㅗ`가 올 때, 궁서체 조형상 세로 꼭지획이 중앙(`50%`)이 아닌 우측(`ㅜ`) 또는 좌하단(`ㅗ`)으로 이동함.
- **규칙 ([`index.html`](file:///c:/project/한글획순/index.html#L1762-L1854))**:
  - 고정 비율(`0.50`)에 의존하지 않고, `ㅜ/ㅠ` 가로획 하단(`stemX_U`) 및 `ㅗ/ㅘ/ㅙ/ㅚ` 가로획 상단(`stemX_O`)의 실제 잉크 밀집 열을 탐색하여 피크 열들의 정중앙(`(peakStart + peakEnd) / 2`)에 중심선을 배치해야 함.

### 불변 조건 6: 복수 가로 곁줄기 모음(`ㅑ, ㅒ, ㅕ, ㅖ`)의 상·하 곁줄기 분리 검출 (`ticks_R`, `ticks_L`) 및 순위별(`tickRank`) 1:1 매핑
- **원인**: 단일 스칼라 `tickY_R` / `tickY_L`만 검출하여 `forceShiftY`를 적용하면, `'여, 역, 겨, 격, 뎌, 뎍'`에서 2번 획(위 가로획)과 3번 획(아래 가로획)이 하나의 Y좌표로 겹치거나, `'약, 갹, 댝'`에서 3번 획과 4번 획의 상하 위치가 뒤바뀌는 치명적 획순 오류가 발생함.
- **규칙 ([`index.html`](file:///c:/project/한글획순/index.html#L1930-L2020), [`index.html`](file:///c:/project/한글획순/index.html#L3220-L3300))**:
  - `computeDynamicJamoBounds`에서 곁줄기 행 히스토그램의 모든 로컬 피크 클러스터를 상단부터 순서대로 배열(`b.ticks_R`, `b.ticks_L`)로 검출해야 함.
  - 받침 있는 글자(`'약'` 등)에서 초성 `ㅇ`의 하단(`choY2`)이 모음 세로기둥 하단보다 높더라도, 반드시 세로기둥(`stem1X_V`)을 따라 실제 기둥 하단(`stem1BotY`)까지 스캔하여 아래쪽 곁줄기가 누락되지 않도록 해야 함.
  - `fitEntriesToGlyph`에서는 중성 내 가로 곁줄기들의 인덱스 순서(`tickRank = 0, 1`)를 구해 `b.ticks_R[tickRank]`, `b.ticks_L[tickRank]`에 각각 1:1로 매핑해야 함.

### 불변 조건 7: 이중 세로기둥 모음(`ㅐ, ㅒ, ㅔ, ㅖ, ㅙ, ㅞ`)의 두 세로기둥 독립 검출 (`stem1X_V`, `stemX_V`, `stemX_C`, `stem2X_C`) 및 좌측 곁줄기(`ㅓ, ㅔ, ㅕ, ㅖ`) 시점(`tickLeftX_L`) 보장
- **원인**:
  1. `'예, 에, 계, 게'`에서 `fitEntriesToGlyph`가 우측 경계만 클램핑하면 `Jung_T1_ㅔ/ㅖ` 박스 폭이 찌그러져 2·3번 가로획이 첫 번째 세로기둥 위나 오른쪽으로 밀리고 길이가 `2~4`로 축소됨.
  2. `'엑, 겍, 덱, 옉, 곅, 뎩'`에서 두 세로기둥의 높이가 비슷할 때 `p2Cols` 전체의 양 끝 평균을 구하면 첫 번째 기둥과 두 번째 기둥의 중간 빈 공간(`X ≈ 61.7%`)을 기둥 위치로 오판함.
  3. `buildGlyphData`의 역방향 연장(`pre.unshift`)에서 `lx100 < firstStemX - 0.2`를 일괄 차단하면 `ㅓ, ㅕ, ㅔ, ㅖ`의 좌측 곁줄기가 왼쪽 끝까지 연장되지 못함.
- **규칙 ([`index.html`](file:///c:/project/한글획순/index.html#L1885-L1925), [`index.html`](file:///c:/project/한글획순/index.html#L2880-L2920), [`index.html`](file:///c:/project/한글획순/index.html#L3900-L3935))**:
  - 우측 끝 세로기둥(`stemX_V`) 검출 시 반드시 `p2Cols`의 **가장 오른쪽 연속 피크 클러스터(`p2StartIdx`)**만 사용하여 첫 번째 기둥과의 평균화 오류를 차단해야 함.
  - 좌측 곁줄기 모음(`ㅓ, ㅔ, ㅕ, ㅖ`)은 첫 번째 기둥 왼쪽에서 곁줄기 두께가 끝나는 실제 시작점(`b.tickLeftX_L`)을 검출하고, 역방향 연장(`pre.unshift`) 및 픽셀 할당 시 `tickLeftX_L`까지 허용해야 함.

### 불변 조건 8: 세로모음 우측 곁줄기 클램핑(`isRightTickJung`) 시 세로기둥 본체 및 `ㅘ/ㅙ`의 `ㅗ` 가로획 트리밍 절대 금지
- **원인**: `isRightTickJung`에서 가로획 여부(`isHorizStroke`)와 `meta.subPart !== 'jung_h'`를 확인하지 않고 `sliced.shift()`를 수행하면, `ㅏ, ㅑ, ㅐ, ㅒ`의 세로기둥 상단 절반이 잘려 나가거나 `ㅘ, ㅙ`의 `ㅗ` 가로획이 잘려 나감.
- **규칙 ([`index.html`](file:///c:/project/한글획순/index.html#L3935-L3945))**:
  - `isRightTickJung` 시작점 클램핑은 반드시 `isHorizStroke && meta.subPart !== 'jung_h'`인 우측 곁줄기 가로획에만 적용해야 함.

### 불변 조건 9: 원형 획(`ㅇ, ㅎ`의 `isLoop`) 내부 백색 홀(White Hole) 기반 대칭 링 정합
- **원인**: `buildGlyphData`에서 `if (isLoop) return;`으로 원형 획 정합을 건너뛰면, `'예, 에'` 등에서 초성 `ㅇ`의 중심선이 실제 글리프 링보다 왼쪽 허공으로 치우침.
- **규칙 ([`index.html`](file:///c:/project/한글획순/index.html#L3693-L3770))**:
  - 원형 획(`isLoop`)은 내부 백색 홀의 무게중심 `(hcx, hcy)`에서 상·하·좌·우로 레이캐스팅하여 내경 `[inL, inR, inT, inB]`과 외경 `[outL, outR, outT, outB]`을 구한 뒤, 인접 자소(`ㅔ, ㅖ`의 가로획 등)와의 접촉으로 한쪽 외경이 부풀어 오르지 않도록 대칭 두께 클램핑(`rR <= rL * 1.25 + 3` 등)을 적용하여 링 정중앙 `[idealL, idealT, idealR, idealB]`에 매핑해야 함.

---

## 2. 누적 오류 및 해결 이력 (Resolved Issue Catalog)

| 번호 | 대표 글자 | 증상 요약 | 근본 원인 (Root Cause) | 수정 파일 및 적용 내용 | 검증 결과 |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **#1** | **웨, 왜, 웽** | 4번 가로획을 그릴 때 5번 세로획으로 잉크가 번지거나, 중심선이 우측 허공으로 밀림 | 1) `warehouse_centerlines.js`의 `Jung_T1/T2_ㅙ/ㅞ` X좌표가 `0.73~0.83`으로 오기재됨<br>2) `index.html`에서 `pre.unshift`가 첫 번째 세로 기둥을 뚫고 좌측으로 연장됨 | - [`warehouse_centerlines.js`](file:///c:/project/한글획순/warehouse_centerlines.js): `Jung_T1/T2_ㅙ/ㅞ` X좌표를 두 세로 기둥 사이(`0.59~0.72`)로 교정<br>- [`index.html`](file:///c:/project/한글획순/index.html): `firstStemX + 0.2` 좌측 역추적 차단 | 통과 (번짐 0%) |
| **#2** | **궁, 국, 군** | `ㅜ`의 세로획(3번 획) 중심선이 실제 글자 획보다 왼쪽에 치우쳐 그려짐 | 초성 `ㄱ` 아래에서 궁서체 `ㅜ` 세로 기둥이 `X=66%`로 우측 이동하나, 기존 탐색 범위가 중앙 부근에 제한됨 | - [`index.html`](file:///c:/project/한글획순/index.html): `stemX_U` 동적 스캔 범위를 확장하고 피크 구간 중앙값으로 보정 | 통과 (정중앙 정렬) |
| **#3** | **되, 됀** | 초성 `ㄷ`이 위아래로 납작하게 눌리고 `ㅚ`의 세로획과 경계가 무너짐 | `ㄷ`의 열린 우측 공간으로 인해 `choY2` 탐색이 `ㅗ` 가로획까지 내려가 초성 영역을 과대 산정함 | - [`index.html`](file:///c:/project/한글획순/index.html): 개방형 초성의 `choY2` 스캔 X범위 정밀화 및 `ㅚ` 높이 클램핑 적용 | 통과 (정상 비율 복원) |
| **#4** | **닮, 달, 다** | 1) 2번 획(ㄷ 하단)이 중간(`53%`)에서 끊기고 4번 획이 그 끝에서 시작됨<br>2) 중심선 연장 후에도 애니메이션 시 2번 획 잉크가 중간에서 멈춤 | 1) 초성 우측 경계가 `splitX`에 막히고 4번 획이 좌측 역추적(`pre.unshift`)으로 침범함<br>2) `buildGlyphData`에서 `hasJong === true`일 때 `lx > splitX + 3` 픽셀에 `1e7` 페널티를 부여해 3번 획이 픽셀을 빼앗아감 | - [`index.html`](file:///c:/project/한글획순/index.html): 초성 하단 가로획을 `firstStemX - 0.5`까지 연장하고 4번 획 좌측 침범 차단<br>- `buildGlyphData`에 `isChoConnBottom` 예외 규칙 추가 | 통과 (67.9%까지 100% 렌더링) |
| **#5** | **나, 날, 낢, 따, 딸, 땀, 라, 랄, 람, 타, 탈, 탐, 파, 팔, 팜** | `ㄷ` 외에 궁서체에서 모음 세로획과 접필되는 모든 초성(`ㄴ, ㄸ, ㄹ, ㅌ, ㅍ`) 및 받침 없는 글자에서 동일한 끊김 발생 | 1) 기존 예외 목록에 `ㄴ, ㄸ, ㅍ`가 누락됨<br>2) 궁서체 우상향 기울기 미추적으로 바닥 경계에서 조기 중단됨<br>3) 받침 없는 글자(`!hasJong`)에서 `b.choY2`가 `undefined`(`NaN`)였음 | - [`index.html`](file:///c:/project/한글획순/index.html): 6종 초성(`['ㄴ','ㄷ','ㄸ','ㄹ','ㅌ','ㅍ']`) 전체 적용, `curEy` 무게중심 추적 추가, `!hasJong` 시 `b.choY2` 초기화 | 18개 대표 음절 및 11,172자 전수 통과 |
| **#6** | **예, 에, 계, 게, 뎨, 데, 옉, 엑, 곅, 겍, 뎩, 덱** | 1) `'예'`에서 1번 획(`ㅇ`) 중심선이 좌측 허공으로 밀림<br>2) 2·3번 가로획이 첫 번째 세로기둥 위쪽에 짧은 점처럼 찌그러짐<br>3) 받침 있는 `'엑, 옉'`에서 우측 세로기둥이 두 기둥 사이 허공(`61.7%`)에 위치함 | 1) `isLoop` 원형 획 글리프 정합 미적용<br>2) `Jung_T1_ㅔ/ㅖ` 박스 우측 클램핑 시 폭 축소 및 `pre.unshift` 좌측 연장 차단<br>3) `stemX_V` 검출 시 두 세로기둥 피크 열이 함께 평균화됨 | - [`index.html`](file:///c:/project/한글획순/index.html): `isLoop` 백색 홀 기반 대칭 링 정합 추가, `stem1X_V`/`stemX_V`/`tickLeftX_L` 기반 해석적 박스 배치 및 최우측 연속 피크 클러스터(`p2StartIdx`) 검출 | 통과 (`ink = 0.95~1.00`) |
| **#7** | **여, 역, 겨, 격, 뎌, 뎍, 야, 약, 갸, 갹, 댜, 댝** | 1) `'여'`에서 2번·3번 가로획이 위쪽 가로획 하나에 겹쳐 그려짐<br>2) `'약'`에서 3번·4번 가로획의 상하 위치가 교차하거나 4번 획 끝이 조기 절단됨 | 1) 단일 스칼라 `tickY_L`/`tickY_R`에 두 가로획을 모두 강제 이동시킴<br>2) `Jung_T1/T2_ㅑ` 상단 가로획 중앙의 72유닛 돌출 및 `'약'`에서 `ySplit`이 `ㅇ` 직하단(`48.9%`)에 고정됨 | - [`warehouse_centerlines.js`](file:///c:/project/한글획순/warehouse_centerlines.js): `Jung_T1/T2_ㅑ` 가로획 수평화 및 세로기둥 상단 사선 제거<br>- [`index.html`](file:///c:/project/한글획순/index.html): `ticks_L`/`ticks_R` 배열 검출 및 `tickRank`별 매핑, `rowSum <= minYVal`로 `ySplit` 보정 | 통과 (`ink = 0.95~1.00`) |
| **#8** | **아, 가, 다, 야, 갸, 댜, 얘, 걔, 댸, 과, 괴, 왜, 왝** | 1) `ㅏ, ㅑ, ㅒ` 세로기둥 상단 절반이 잘려 나감<br>2) `'과, 괴'`에서 `ㅗ` 세로획이 좌측으로 밀리고, `'가, 개, 갸'`에서 궁서체 `ㄱ` 곡선과 중심선이 어긋남 | 1) `isRightTickJung`이 세로기둥 본체와 `ㅘ/ㅙ`의 `ㅗ` 가로획까지 `sliced.shift()`로 잘라냄<br>2) `stemX_O` 미검출 및 `Cho_T1_ㄱ` 직각 꺾임 좌표 | - [`index.html`](file:///c:/project/한글획순/index.html): `isRightTickJung`에 `isHorizStroke && meta.subPart !== 'jung_h'` 조건 추가, `stemX_O` 검출 추가<br>- [`warehouse_centerlines.js`](file:///c:/project/한글획순/warehouse_centerlines.js): `Cho_T1_ㄱ` 궁서체 곡선 중심선 정합 | 21개 전체 모음 통과 |

---

## 3. 코드 수정 후 필수 검수 프로토콜 (Mandatory Verification Protocol)

엔진 코드([`index.html`](file:///c:/project/한글획순/index.html) 또는 [`warehouse_centerlines.js`](file:///c:/project/한글획순/warehouse_centerlines.js))를 수정한 후에는 **반드시 아래 2개의 자동화 검수 스크립트를 실행**하여 이상이 없음을 확인한 뒤 보고해야 합니다.

### ① 궁서체 6대 접필 초성(`ㄴ, ㄷ, ㄸ, ㄹ, ㅌ, ㅍ`) 정밀 검수
```powershell
node tools/check_6_chos_detail.js
```
- **합격 기준**: `나, 날, 낢, 다, 달, 닮, 따, 딸, 땀, 라, 랄, 람, 타, 탈, 탐, 파, 팔, 팜` 18개 음절 모두에서:
  - `choEnd` (초성 하단 가로획 중심선 끝점) ≥ `65.5%` (`stemX` 직전까지 도달)
  - `assignedToChoRightXPct` (실제 초성 획에 할당된 최우측 잉크 픽셀) ≥ `65.5%` (애니메이션 시 끝까지 그려짐 보장)

### ② 동영상 프레임 초정밀 하네스 검수 (무작위 + 취약 아키타입 100자 / 8,150+ 프레임)
```powershell
node tools/harness_random_sampling_video_precision.js
```
- **합격 기준**:
  - `offInkPoints === 0` (중심선이 글자 잉크 밖 허공으로 이탈한 포인트 0건)
  - `unassignedInkRatio === 0` (어느 획에도 할당되지 않아 안 그려지는 픽셀 0건)
  - `bleedFrames === 0` (특정 획이 그려지는 동영상 프레임 동안 다음 획 영역으로 번지는 프레임 0건)
  - `cutoffStrokes === 0` (획이 끝까지 그려지지 않고 중간에 끊기는 현상 0건)

### ③ 21개 한글 기본모음·복합모음 전수 하네스 검수 (`ㅏ → ㅐ → ㅑ → ㅒ → ㅓ → ㅔ → ㅕ → ㅖ → ㅗ → ㅘ → ㅙ → ㅚ → ㅛ → ㅜ → ㅝ → ㅞ → ㅟ → ㅠ → ㅡ → ㅢ → ㅣ`)
```powershell
node tools/inspect_all_21_vowels.js
node tools/harness_21_vowels_video_precision.js
```
- **합격 기준 (820개 대표 음절 / 6,024획 / 18,072 동영상 프레임)**:
  - `Stroke Order Compliance === 100%` (초성 → 중성(`jung_h` → `jung_v`) → 종성 획순 100% 일치)
  - `Multi-Tick Vertical Separation === 100%` (`ㅑ, ㅒ, ㅕ, ㅖ`의 상단 가로획이 하단 가로획보다 항상 $\Delta y \ge 7.0$ 이상 위쪽에 분리 배치)
  - `Future Frame Bleed Events === 0` ($u = 0 \to 0.5 \to 1.0$ 동영상 프레임 진행 중 후속 획 코어 영역으로의 먹물 번짐 0건)
  - `onInkRatio` 평균 $\ge 98.5\%$ 이상 유지

## 2026-10-29 궁서체 153자소 중심선 전수 보정
- 원인: 창고 JSON 일부 자소(45개)의 제어점이 gungsuhOutline 밖이거나 획이 꼬임(ㅁ/ㅂ/ㅅ/ㅆ/ㅈ/ㅉ/ㅊ/ㅋ/ㅍ, ㅘ~ㅠ, ㄹ계열 받침, ㅎ·ㅇ 고리).
- 조치: tools/calibrate_all_153_warehouse_parts.js (외곽선 슬라이스 기반 중심선 재작성 + 외곽선 안쪽 스냅 + 급꺾임 제거 + 획두께/box 재산출), calibrationVersion 3.5로 올려 localStorage 캐시 무효화.
- 검증: 외곽 이탈점 0 / 저비율 획 0 / 급꺾임 0, 갤러리(8000) outPts=0 badParts=[], build_centerlines 검증 통과.
- 재발 방지: 창고 JSON 수정 후 반드시 calibrate → build_centerlines → verify_gallery_8000 순으로 실행.

## 2026-10-30 궁서체 153자소 붉은 획 애니메이션(HanziWriter) 획순 및 폐곡선 전수 보정
- 원인:
  1. 원형 획(ㅇ, ㅎ, ㄶ, ㅀ 총 14개)의 끝점이 시작점과 12도(35px) 떨어져 폐곡선이 닫히지 않아 상단에 먹물 미채움 결손 발생.
  2. `Cho_T2_ㅍ`: 2획·3획 세로 기둥이 상단 가로바에서 너무 멀리 떨어져 시작하고 우측 기둥이 가로 획으로 왜곡됨.
  3. `Jong_T1_ㅍ`: 좌우 세로 기둥이 상단 가로바 아래 너무 깊은 곳(100px)에서 시작하여 공중에 뜬 채 애니메이션 재생됨.
  4. `Jung_T1_ㅖ`: 좌측 세로 기둥과 우측 세로 기둥의 x좌표가 동일(862px)하게 겹쳐 좌측 세로 기둥 실종 및 스트로크 마스크 불일치.
  5. `Jong_T1_ㄷ`, `Jong_T2_ㄷ`: 2획(ㄴ형)이 1획(상단 가로)보다 위쪽에서 시작해 획순 충돌 발생.
  6. `Cho_T1_ㄹ`: 3획(하단 ㄴ형)이 2획(가운데 가로)보다 위쪽에서 시작하여 획간 간섭 발생.
- 조치:
  1. 14개 원형 획을 360도 완전 폐곡선(`closeDist = 0`)으로 재구성하여 12시 방향에서 시작해 반시계로 완전히 닫히도록 교정.
  2. `Cho_T2_ㅍ`, `Jong_T1_ㅍ`의 좌우 수직 기둥을 상단 가로바 접촉면부터 하단 가로바까지 정확히 상→하로 연결.
  3. `Jung_T1_ㅖ`의 좌측 세로 기둥을 x=735 위치로 복원하고 subpath 스트로크 마스크 분리 매핑.
  4. `Jong_T1_ㄷ`, `Jong_T2_ㄷ` 2획을 상단 가로바 좌하단에서 자연스럽게 내려오도록 조정.
  5. `Cho_T1_ㄹ` 3획 시작점을 2획 하단으로 내려 획 충돌 제거.
  6. `calibrationVersion`을 `3.6-perfect-red-animation-calibrated`로 상향하여 브라우저 localStorage 캐시 자동 무효화.
  7. 자가 치유 무한루프 하네스(`tools/harness_warehouse_infinite_loop.js`) 구현:
     - 153개 자소의 방향, 획순, 폐곡선, 구조 연결성을 라운드별로 전수 검사하고, 결함 발견 시 자동으로 정밀 치유하여 0 issues 도달 시까지 루프 순환.
     - `--watch` 옵션 지원으로 실시간 변경 감시 및 자동 치유 무한 루프 유지.
- 검증:
  - `node tools/harness_warehouse_infinite_loop.js` (자가 치유 하네스 0 issues 통과)
  - `node tools/audit_all_153_parts.js` 통과 (0 issues)
  - `node tools/inspect_all_153_structures.js` 통과 (0 issues)
  - `node tools/deep_audit_warehouse.js` 통과 (0 issues)
  - `node tools/check_sharp_turns.js` 통과 (0 sharp turns)
  - `node tools/verify_gallery_8000.js` 통과 (`outPts: 0`, `badParts: []`)

## 2026-10-30 한글 19개 전체 자음 획순 및 궁서체 조형 정밀 검사 하네스 전수 검증 (418 / 418 합격)
- 대상: `ㄱ, ㄴ, ㄷ, ㄹ, ㅁ, ㅂ, ㅅ, ㅇ, ㅈ, ㅊ, ㅋ, ㅌ, ㅍ, ㅎ, ㄲ, ㄸ, ㅃ, ㅆ, ㅉ` 19개 단독 자음 및 전체 21모음 결합 399음절 (총 418개 글자 대상 100% 전수 하네스).
- 하네스 사양 (`tools/harness_19_consonants_stroke_order.js`):
  1. 표준 한글 획순(Stroke Order) 및 획수 전수 일치 검증.
  2. 획 형태 분류 (수평 H, 수직 V, 꺾임 G, 꺾임 N, 좌하향 삐침 L, 우하향 빗침 R, 12시 시작 반시계 폐곡선 원 O, 점 D).
  3. 자음 내 구성 획 간의 상대적 위상(X/Y 순서, 좌우 세로 배치, 상하 가로 배치, 점 위치) 검증.
  4. 실제 궁서체 폰트 렌더링 잉크와의 중심선 일치도(`onInkRatio`), 점 연속 커버리지(`cov`), 수필부 픽셀 배정(`tailOwned`) 검증.
- 핵심 조치 사항:
  1. [`index.html`](file:///c:/project/한글획순/index.html#L2160-L2175) (`computeDynamicJamoBounds`): 세로 모음(`ㅏ, ㅑ, ㅓ, ㅕ, ㅐ, ㅒ, ㅔ, ㅖ`) 상단 기필(serif)이 초성 경계 박스 상단(`choYTop`)으로 잘못 편입되던 현상을 기필 X필터링으로 원천 차단하여 `따, 땨, 짜, 쨔, 매, 싸` 등의 초성 바운딩 박스 정밀화.
  2. [`index.html`](file:///c:/project/한글획순/index.html#L3393-L3395) (`fitEntriesToGlyph`): 초성(`cho`)의 최적화 변위(`maxShiftX, maxShiftY`)를 1.2%로 제약하여, 글리프 외부 공백으로 중심선이 이탈하지 않도록 안정화.
  3. [`index.html`](file:///c:/project/한글획순/index.html#L4024) (`buildGlyphData`): 획 꼬리 자르기(Trim) 최소 유지 임계값을 0.70에서 0.45로 합리화하여, 초성 삐침(`서, 세, 셔, 셰`의 `ㅅ`)이 공백으로 삐져나가는 현상 방지.
  4. [`hangul_150_parts_warehouse.json`](file:///c:/project/app_clone/auto_income/hangul_150_parts_warehouse.json) 및 [`warehouse_centerlines.js`](file:///c:/project/한글획순/warehouse_centerlines.js):
     - `Cho_T1_ㄲ`: 1번 획 끝점을 궁서체 붓길에 맞춰 [230, 500]으로 조정하여 2번 획과의 중첩 왜곡 해소 (`까` onInk 0.60 → 0.97).
     - `Cho_T2_ㅋ`, `Cho_T3_ㅋ`: 가운데 가로획 Y좌표를 붓 획 중심(Y≈650~655)으로 재조정 (`코, 쿼, 퀴, 퀘, 킈` onInk 0.35 → 1.00).
- 최종 검증 결과:
  - `node tools/harness_19_consonants_stroke_order.js`: **418개 검사, 문제 음절 0개 (100.0% All Pass)**
  - `node tools/check_6_chos_detail.js`: 통과 (Exit code 0)
  - `node tools/strict_syllable_audit.js`: 통과 (Exit code 0)

## 2026-10-30 궁서체 153자소 붉은 획 애니메이션 실시간 동영상 프레임 정밀 분석 및 보로노이 분할 무결점 엔진 완성
- 대상: 창고 153개 전체 자소 및 'ㅈ' 계열 자음(`Cho_T1_ㅈ`, `Cho_T2_ㅈ`, `Cho_T3_ㅈ`, `Jong_T1_ㅈ`, `Jong_T2_ㅈ`)
- 원인 및 결함 분석:
  1. **초기 로딩 시 이중 애니메이션 충돌(Race Condition)**: `updateHanziPreview()` 내 `charDataLoader` 콜백의 40ms 타이머가 백그라운드에서 `playPreviewAnim()`을 자동 호출하여, 사용자가 재생 버튼을 누르거나 검증 스크립트가 실행될 때 비동기 루프 2개가 동시 실행되면서 획간 프레임이 덮어써지던 오류 원천 차단.
  2. **보로노이 분할 그리드 스팬 엔진 탑재(`computeExactVoronoiSpanPaths`)**: 기존 무한 반평면(half-plane) 교차 방식에서 발생하던 미세 꼭짓점/귀 절삭 현상(예: `Cho_T1_ㅂ` 우상단 귀 절삭)을 4px 격자 기반 엄밀 다각형 스팬 엔진으로 교체하여 외곽선 100% 밀착 커버 및 획간 번짐(Wall Bleed) 0% 달성.
  3. **'ㅈ' 획순 및 프레임 정밀 분석**: 가로 획(Stroke 0) $\to$ 좌측 삐침(Stroke 1) $\to$ 우측 파임(Stroke 2) 순으로 먹물이 단계별로 번짐 없이 점진 확장되며 온전히 채워짐을 확인.
- 조치 사항:
  1. `view_150_warehouse_gallery.html`에서 불필요한 자동 애니메이션 호출 제거 및 사용자 명시적 호출/버튼 연동 구조로 전환.
  2. 5대 창고 저장소(`hangul_150_parts_warehouse.json`, `test/hangul_150_parts_warehouse.json`, `hangul_150_parts_warehouse.js`, `test/hangul_150_parts_warehouse.js`, `warehouse_centerlines.js`) 100% 동기화.
- 최종 검증 결과:
  - `node tools/harness_153_video_precision_audit.js`: 153/153 PASS (100.0%)
  - 실시간 CDP 비디오 프레임 추출 및 픽셀 전수 검증 통과 (번짐 0건, 빈 공간 0건).

