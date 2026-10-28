# 한글 획순 애니메이션 엔진 — 하네스 엔지니어링 & 하이브리드 파이프라인 지침서 (CLAUDE.md)

본 문서는 사용자님이 제시한 **하이브리드 한글 획순 파이프라인**과 Claude Code 창시자 Boris Cherny의 영상([*"The 'Real' Vibe Coding, Straight from the Creator of Claude Code"*](https://youtu.be/wgrpasYyiIQ?si=QWVG9_2dVSgf-XUJ))의 **하네스 엔지니어링(Harnessed Engineering)** 원칙을 코드베이스에 적용한 에이전트 작업 지침서입니다.

## 1. 하네스 엔지니어링 (Harnessed Engineering) 핵심 수칙
1. **프롬프트 미세조정 대신 결정론적 하네스(Deterministic Harness)로 검증하라**:
   - 특정 글자(`'팧'`, `'괜'`, `'정'` 등)의 중심선 오류를 수정할 때는 반드시 전체 자소·음절 감사 스크립트를 실행하여 회귀(Regression)가 없는지 확인합니다.
2. **자가 검증 루프 (Self-Verifying Loop)**:
   - 코드 변경 후 아래 4대 검증 명령어를 실행하고, 단 하나의 경고도 남지 않을 때(`0 issues`)만 작업을 완료합니다:
     - `node tools/audit_all_153_parts.js` (153개 창고 자소 기하·위상 검증)
     - `node tools/inspect_all_153_structures.js` (153개 창고 자소 구조 연결성 검증)
     - `node tools/strict_syllable_audit.js` (Headless Chrome 기반 실제 궁서체 잉크 커버리지 검증)
     - `node tools/diagnose_all_characters.js` (191개 대표 음절 픽셀 배정·고립 섬·획 방향 검증)

## 2. 하이브리드 파이프라인 설계 구조
1. **기준 골격 데이터 (`warehouse_centerlines.js` & `JAMO_DB`)**:
   - 초·중·종성 및 결합 타입(`T1`=세로모음, `T2`=가로모음, `T3`=종성포함)별 153개 표준 중심선 골격을 관리합니다.
   - 모든 수평획은 좌→우(`dx > 0`), 수직획은 상→하, 원형 획(`ㅇ, ㅎ`)은 12시 방향에서 시작해 반시계 방향으로 완전히 닫히는(`closeDist = 0`) 타원이어야 합니다.
2. **동적 분할벽 추출 (`computeDynamicJamoBounds` in `index.html`)**:
   - 실제 궁서체 글리프의 알파 히스토그램에서 초·중·종성 분할벽(`splitX`, `choY2`, `jongY1`)을 계산할 때, 종성(받침) 잉크가 상단 좌우 분할벽(`splitX`) 계산을 오염시키지 않도록 상단 영역(`minY ~ ySplit`)만 투영합니다.
3. **자소 박스 정합 및 먹물 분할 (`fitEntriesToGlyph` & `buildGlyphData` in `index.html`)**:
   - 각 자소 박스를 분할벽 내부에 맞게 스케일·정합한 뒤, 거리 변환(Distance Transform)과 8-연결 컴포넌트를 통해 모든 잉크 픽셀을 단일 연결 스트로크(`islands === 1`)로 배정합니다.
