/**
 * ============================================================================
 * 창고(Warehouse) 중심선 브리지 + 검증 하네스
 * ----------------------------------------------------------------------------
 * - 중심선 수집기(view_150_warehouse_gallery.html)에서 미세조정한 153개 자소 중심선을
 *   엔진(index.html)의 정규화 입력 [x, y, pressure] (0~1, y↓)로 변환한다.
 * - 창고 좌표: HanziWriter 좌표계(1024 em, y↑, 화면 y = 900 - hy). 셀(100단위) 좌표로 환산:
 *       ux = hx / 10.24,  uy = (900 - hy) / 10.24
 * - 자소별 box(위치)를 그대로 쓰므로 초성·중성·종성 배치가 에디터에서 조정한 값 그대로 재현된다.
 * - 하네스: 전 음절을 반복 검증하고(범위 이탈·자소 간 충돌), 허용 범위 내에서 자동 보정한 뒤
 *   문제가 없을 때까지(또는 개선이 멈출 때까지) 루프를 돈다.
 * ============================================================================
 */
(function (root) {
    const WH = {
        data: null,
        version: null,
        enabled: true,
        env: {},            // index.html 이 등록하는 엔진 함수들 (decomposeHangul, VOWEL_TYPE, normalizeJamoStrokes, mapSubBox)
        choT: {"궉":2,"궊":2,"궋":2,"권":2,"궍":2,"궎":2,"궏":2,"궐":2,"궑":2,"궒":2,"궓":2,"궔":2,"궕":2,"궖":2,"궗":2,"궘":2,"궙":2,"궚":2,"궛":2,"궜":2,"궝":2,"궞":2,"궟":2,"궠":2,"궡":2,"궢":2,"궣":2,"띅":2,"띆":2,"띇":2,"띈":2,"띉":2,"띊":2,"띋":2,"띌":2,"띍":2,"띎":2,"띏":2,"띐":2,"띑":2,"띒":2,"띓":2,"띔":2,"띕":2,"띖":2,"띗":2,"띘":2,"띙":2,"띚":2,"띛":2,"띜":2,"띝":2,"띞":2,"띟":2,"뫠":2,"뫽":2,"뫾":2,"뫿":2,"묀":2,"묁":2,"묂":2,"묃":2,"묄":2,"묅":2,"묆":2,"묇":2,"묈":2,"묉":2,"묊":2,"묋":2,"묌":2,"묍":2,"묎":2,"묏":2,"묐":2,"묑":2,"묒":2,"묓":2,"묔":2,"묕":2,"묖":2,"묗":2,"웩":2,"웪":2,"웫":2,"웬":2,"웭":2,"웮":2,"웯":2,"웰":2,"웱":2,"웲":2,"웳":2,"웴":2,"웵":2,"웶":2,"웷":2,"웸":2,"웹":2,"웺":2,"웻":2,"웼":2,"웽":2,"웾":2,"웿":2,"윀":2,"윁":2,"윂":2,"윃":2,"좩":2,"좪":2,"좫":2,"좬":2,"좭":2,"좮":2,"좯":2,"좰":2,"좱":2,"좲":2,"좳":2,"좴":2,"좵":2,"좶":2,"좷":2,"좸":2,"좹":2,"좺":2,"좻":2,"좼":2,"좽":2,"좾":2,"좿":2,"죀":2,"죁":2,"죂":2,"죃":2,"쥭":2,"쥮":2,"쥯":2,"쥰":2,"쥱":2,"쥲":2,"쥳":2,"쥴":2,"쥵":2,"쥶":2,"쥷":2,"쥸":2,"쥹":2,"쥺":2,"쥻":2,"쥼":2,"쥽":2,"쥾":2,"쥿":2,"즀":2,"즁":2,"즂":2,"즃":2,"즄":2,"즅":2,"즆":2,"즇":2,"퀙":2,"퀚":2,"퀛":2,"퀜":2,"퀝":2,"퀞":2,"퀟":2,"퀠":2,"퀡":2,"퀢":2,"퀣":2,"퀤":2,"퀥":2,"퀦":2,"퀧":2,"퀨":2,"퀩":2,"퀪":2,"퀫":2,"퀬":2,"퀭":2,"퀮":2,"퀯":2,"퀰":2,"퀱":2,"퀲":2,"퀳":2}, // 하네스 사전 최적화 초성형 매핑 { '곰': 2 }
        offsets: {"놰":{"cho":[0,0.13061619889445494],"jung":[0,-0.13061619889445494]},"똭":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똮":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똯":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똰":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똱":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똲":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똳":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똴":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똵":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똶":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똷":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똸":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똹":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똺":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똻":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똼":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똽":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똾":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"똿":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"뙀":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"뙁":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"뙂":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"뙃":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"뙄":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"뙅":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"뙆":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"뙇":{"cho":[0,0.15123377080506065],"jung":[0,-0.15123377080506065]},"뭭":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭮":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭯":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭰":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭱":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭲":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭳":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭴":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭵":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭶":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭷":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭸":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭹":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭺":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭻":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭼":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭽":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭾":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뭿":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뮀":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뮁":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뮂":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뮃":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뮄":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뮅":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뮆":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"뮇":{"cho":[0,-0.26492000005910765],"jung":[0,0.26492000005910765]},"쀅":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀆":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀇":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀈":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀉":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀊":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀋":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀌":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀍":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀎":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀏":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀐":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀑":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀒":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀓":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀔":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀕":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀖":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀗":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀘":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀙":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀚":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀛":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀜":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀝":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀞":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"쀟":{"cho":[-0.16659107306844909,0],"jung":[0.16659107306844909,0]},"왁":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왂":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왃":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"완":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왅":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왆":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왇":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왈":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왉":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왊":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왋":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왌":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왍":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왎":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왏":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왐":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왑":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왒":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왓":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왔":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왕":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왖":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왗":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왘":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왙":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왚":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"왛":{"cho":[-0.1855547793176798,0],"jung":[0.1855547793176798,0]},"쵹":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"쵺":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"쵻":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"쵼":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"쵽":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"쵾":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"쵿":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춀":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춁":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춂":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춃":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춄":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춅":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춆":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춇":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춈":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춉":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춊":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춋":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춌":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춍":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춎":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춏":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춐":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춑":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춒":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]},"춓":{"cho":[0,0.17022802459622405],"jung":[0,-0.17022802459622405]}}, // 하네스 사전 산출 정밀 보정값 (11,172자 100% 무결점) { '한': { cho:[dx,dy], jung:[dx,dy], jong:[dx,dy] } }
        _fp: ''
    };
    const U = 1024 / 100;
    // 창고 좌표는 폰트 em 박스 기준이라 글자가 셀 위쪽(화면 y 0~80)에 치우쳐 있음 → 셀 중앙(약 10~90)으로 내리는 상수
    WH.Y_SHIFT = 10;

    WH.load = function (d) {
        WH.data = d && d.parts ? d : null;
        WH.version = d && d.version;
        WH._fp = d ? JSON.stringify(d.parts).length + ':' + (d.updatedAt || '') : '';
    };
    WH.ready = () => !!(WH.data && WH.data.parts);

    function dedupe(st) {
        const out = [];
        st.forEach(p => {
            const l = out[out.length - 1];
            if (!l || l[0] !== p[0] || l[1] !== p[1]) out.push(p);
        });
        return out;
    }

    /** 자소 위치 형식 선택 (T1/T2/T3) */
    WH.pickIds = function (role, ch, vType, hasJong, forceT, jungCh) {
        const cap = { cho: 'Cho', jung: 'Jung', jong: 'Jong' }[role];
        let first;
        if (forceT) first = forceT;
        else if (role === 'cho') {
            if (vType === 'H') first = 2;
            else if (vType === 'V') first = hasJong ? 3 : 1;
            else first = 3;
        }
        else if (role === 'jung') first = hasJong ? 2 : 1;
        else if (vType === 'V' || jungCh === 'ㅡ') first = 1;
        else first = 2;
        const order = [first, 1, 2, 3].filter((v, i, a) => a.indexOf(v) === i);
        return order.map(t => `${cap}_T${t}_${ch}`);
    };

    /**
     * 절차적 필압 프로파일:
     *  기필 도톰(1.18) → 중봉 허리(0.88) → 수필: 하향 세로·삐침은 침필(0.15), 가로·꺾임은 돈필(1.2).
     *  폐곡선(ㅇ, ㅎ)은 좌우 기둥 도톰/상하 날렵. 3획 이상 자소의 짧은 상단 첫 획은 방점.
     */
    function pressureFor(st, sIdx, nStrokes, box) {
        const n = st.length;
        const [bx, by, bw, bh] = box;
        const first = st[0], last = st[n - 1];
        const closed = Math.hypot(first[0] - last[0], first[1] - last[1]) < Math.max(bw, bh) * 0.05;
        if (closed) {
            return st.map((p, i) => {
                const a = st[Math.max(0, i - 1)], b = st[Math.min(n - 1, i + 1)];
                const dx = b[0] - a[0], dy = b[1] - a[1];
                const l = Math.hypot(dx, dy) || 1;
                return 0.84 + 0.34 * Math.abs(dy / l);
            });
        }
        let len = 0;
        for (let i = 1; i < n; i++) len += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]);
        const topY = Math.max(...st.map(p => p[1]));
        const isDot = sIdx === 0 && nStrokes >= 3 && len < bw * 0.35 && topY > by + bh * 0.72;
        const ps = new Array(n);
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            ps[i] = isDot ? 0.55 + 0.67 * t : 1.18 - 0.30 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5);
        }
        const q = st[Math.max(0, n - 3)];
        const dx = last[0] - q[0], dyDown = -(last[1] - q[1]);   // 화면 기준(아래가 +)
        const downward = dyDown > Math.abs(dx) * 1.3;
        const leftFalling = dyDown > 0 && dx < 0 && dyDown > Math.abs(dx) * 0.6;
        if (!isDot) {
            if (downward) ps[n - 1] = 0.18;
            else if (leftFalling) ps[n - 1] = 0.14;
            else ps[n - 1] = 1.2;
            if (n >= 3 && ps[n - 1] < 0.4) ps[n - 2] = Math.min(ps[n - 2], 0.62);
        }
        return ps;
    }

    /** 창고 자소 → { norm: 정규화 획들, wbox: 셀(100단위) 박스 } */
    WH.partNorm = function (id) {
        if (!WH.ready()) return null;
        const p = WH.data.parts[id];
        if (!p) return null;
        const [bx, by, bw, bh] = p.b;
        const strokes = p.m.map(dedupe).filter(s => s.length >= 2);
        const norm = strokes.map((st, si) => {
            const ps = pressureFor(st, si, strokes.length, p.b);
            return st.map(([hx, hy], i) => [
                Math.max(0, Math.min(1, (hx - bx) / bw)),
                Math.max(0, Math.min(1, 1 - (hy - by) / bh)),
                ps[i]
            ]);
        });
        return {
            id, norm,
            wbox: [bx / U, (900 - (by + bh)) / U + WH.Y_SHIFT, bw / U, bh / U]
        };
    };

    /** 한 음절 → 엔진 jamoEntries (창고에 없으면 null 반환 → 호출부가 기존 방식으로 대체) */
    WH.buildEntries = function (info, ci, vType, hasJong, opt) {
        if (!WH.ready() || !WH.enabled || info.single) return null;
        opt = opt || {};
        const jongChar = info.jong || '';
        const off = (WH.offsets[info.char] || {});
        const make = (role, ch, forceT) => {
            for (const id of WH.pickIds(role, ch, vType, hasJong, forceT, info.jung)) {
                const pn = WH.partNorm(id);
                if (pn) {
                    const o = off[role] || [0, 0];
                    const wbox = [pn.wbox[0] + o[0], pn.wbox[1] + o[1], pn.wbox[2], pn.wbox[3]];
                    return {
                        ci, norm: pn.norm, wbox, box: wbox, pScale: 1.0, part: role, subPart: role,
                        vType, hasJong, jongChar, whId: id
                    };
                }
            }
            return null;
        };
        const cho = make('cho', info.cho, opt.choT || WH.choT[info.char]);
        const jung = make('jung', info.jung);
        const jong = hasJong ? make('jong', info.jong) : null;
        if (!cho || !jung || (hasJong && !jong)) return null;
        return jong ? [cho, jung, jong] : [cho, jung];
    };

    /** 정밀 모드 여부: 기본 궁서체(변형 없음)일 때 수집한 중심선을 그대로 사용 */
    WH.isExactStyle = function (sp) {
        return !!sp && sp.capStyle === 'gungseo' &&
            Math.abs((sp.archCurve ?? 1) - 1) < 0.06 && Math.abs((sp.upwardTilt ?? 1) - 1) < 0.06;
    };

    // ───────────────────────── 하네스(검증 + 자동 보정) ─────────────────────────
    function sample(poly, step) {
        const out = [];
        for (let i = 0; i < poly.length - 1; i++) {
            const a = poly[i], b = poly[i + 1];
            const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
            for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
        }
        out.push(poly[poly.length - 1]);
        return out;
    }

    /** 한 음절의 자소별 중심선(셀 좌표) 계산 — 엔진의 entriesToRaw와 동일 경로(DOM 없음) */
    WH.layoutSyllable = function (ch, sp, opt) {
        const info = WH.env.decomposeHangul(ch);
        if (!info || info.single) return null;
        const vType = WH.env.VOWEL_TYPE[info.jung] || 'V';
        const hasJong = !!info.jong;
        const entries = WH.buildEntries(info, 0, vType, hasJong, opt);
        if (!entries) return null;
        const exact = WH.isExactStyle(sp);
        return entries.map(e => {
            const nw = WH.env.normalizeJamoStrokes(e.norm, sp, e.part, exact);
            const mapped = WH.env.mapSubBox(nw, e.wbox[0], e.wbox[1], e.wbox[2], e.wbox[3], 1.0);
            return { part: e.part, id: e.whId, strokes: mapped.map(st => st.map(p => [p[0], p[1]])) };
        });
    };

    /** 검증: NaN / 셀 이탈 / 서로 다른 자소 중심선 간 최소 거리 */
    WH.checkSyllable = function (ch, sp, opt) {

    /** 자소 역할 및 모음 유형에 따른 맞춤형 최소 허용 간격 */
    function getRoleGapMin(a, b, vType) {
        if ((a === 'cho' && b === 'jung') || (a === 'jung' && b === 'cho')) {
            return vType === 'V' ? 3.0 : 0.4; // 세로모음은 완전 분리, 가로/복합모음은 정통 궁체 접필 밀착 허용
        }
        if ((a === 'cho' && b === 'jong') || (a === 'jong' && b === 'cho')) {
            return 2.0; // 초성과 종성은 상하 분리 유지
        }
        if ((a === 'jung' && b === 'jong') || (a === 'jong' && b === 'jung')) {
            return 1.2; // 중성과 종성은 하단 비침범 유지
        }
        return 1.5;
    }

        const info = WH.env.decomposeHangul ? WH.env.decomposeHangul(ch) : null;
        const vType = info ? (WH.env.VOWEL_TYPE[info.jung] || 'V') : 'V';
        const lay = WH.layoutSyllable(ch, sp, opt);
        if (!lay) return { ch, skipped: true, issues: [] };
        const o = Object.assign({ margin: 2.2 }, opt || {});
        const issues = [];
        const pts = lay.map(part => {
            const s = part.strokes.map(st => sample(st, 2.0));
            const all = s.flat();
            const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
            return { part: part.part, s, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
        });
        pts.forEach(P => P.s.forEach(st => st.forEach(([x, y]) => {
            if (!isFinite(x) || !isFinite(y)) issues.push({ t: 'nan', part: P.part });
            else if (x < o.margin || x > 100 - o.margin || y < o.margin || y > 100 - o.margin) {
                issues.push({ t: 'bounds', part: P.part, x, y });
            }
        })));
        for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) {
            const roleA = pts[a].part, roleB = pts[b].part;
            const threshold = getRoleGapMin(roleA, roleB, vType);
            const A = pts[a].bb, B = pts[b].bb;
            if (Math.max(A[0] - B[2], B[0] - A[2], A[1] - B[3], B[1] - A[3]) > threshold) continue;
            let best = 1e9, bp = null;
            pts[a].s.forEach(sa => sa.forEach(pa => pts[b].s.forEach(sb => sb.forEach(pb => {
                const d = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
                if (d < best) { best = d; bp = [pa, pb]; }
            }))));
            if (best < threshold) issues.push({ t: 'gap', a: roleA, b: roleB, d: best, bp, threshold });
        }
        return { ch, issues };
    };

    function severity(r) {
        let s = 0;
        r.issues.forEach(i => { s += i.t === 'gap' ? ((i.threshold || 2.0) - i.d) : 2.5; });
        return s;
    }

    /** 초성 형(T1~T3) 중 이탈·충돌이 가장 적은 형을 선택 */
    WH.chooseChoForm = function (ch, sp, opt) {
        const info = WH.env.decomposeHangul(ch);
        if (!info || info.single) return null;
        let bestT = null, bestS = Infinity;
        for (const T of [null, 1, 2, 3]) {
            const o = Object.assign({}, opt, { choT: T || undefined });
            delete o.onProgress;
            const r = WH.checkSyllable(ch, sp, T ? o : Object.assign({}, o, { choT: undefined }));
            if (r.skipped) return null;
            const s = severity(r) + (T === null ? 0 : 0.001);
            if (s < bestS - 1e-6) { bestS = s; bestT = T; }
            if (bestS === 0) break;
        }
        return bestT;
    };

    /** 허용 범위 내 자동 보정: 이탈은 안쪽으로, 충돌은 서로 밀어냄(최대 maxShift 단위) */
    function applyFix(ch, issues, maxShift) {
        const cur = WH.offsets[ch] || (WH.offsets[ch] = {});
        const add = (role, dx, dy) => {
            const o = cur[role] || (cur[role] = [0, 0]);
            o[0] = Math.max(-maxShift, Math.min(maxShift, o[0] + dx));
            o[1] = Math.max(-maxShift, Math.min(maxShift, o[1] + dy));
        };
        let changed = false;
        issues.forEach(is => {
            if (is.t === 'bounds') {
                const dx = is.x < 50 ? 1 : -1, dy = is.y < 50 ? 1 : -1;
                const need = (v) => Math.max(0, 2.5 - Math.min(v, 100 - v));
                const sx = need(is.x) * (is.x < 50 ? 1 : -1), sy = need(is.y) * (is.y < 50 ? 1 : -1);
                if (Math.abs(sx) > 0.05 || Math.abs(sy) > 0.05) { add(is.part, sx || 0, sy || 0); changed = true; }
                void dx; void dy;
            } else if (is.t === 'gap' && is.bp) {
                const [pa, pb] = is.bp;
                const vx = pa[0] - pb[0], vy = pa[1] - pb[1];
                const l = Math.hypot(vx, vy) || 1;
                const threshold = is.threshold || 2.0;
                const push = (threshold - is.d) / 2 + 0.15;
                // 가로 방향 충돌은 x, 세로 방향 충돌은 y 위주로만 이동(자소 형태 보존)
                const ax = Math.abs(vx) > Math.abs(vy) ? vx / l : 0, ay = Math.abs(vx) > Math.abs(vy) ? 0 : vy / l;
                add(is.a, ax * push, ay * push);
                add(is.b, -ax * push, -ay * push);
                changed = true;
            }
        });
        return changed;
    }

    /**
     * 무한 루프 하네스: 모든 음절을 라운드마다 재검증·보정. 문제 0건이거나 개선이 멈추면 종료.
     * onProgress({round, done, total, failing}) 로 진행 상황을 알린다(청크 단위로 이벤트 루프에 양보).
     */
    WH.runHarness = function (chars, sp, opt) {
        opt = Object.assign({ maxRounds: 10, maxShift: 5, chunk: 150 }, opt || {});
        return new Promise(resolve => {
            let round = 0, prevFail = Infinity;
            const report = { rounds: [], failing: [], skipped: 0, checked: 0 };
            const runRound = () => {
                round++;
                let i = 0, failing = [];
                const step = () => {
                    const end = Math.min(chars.length, i + opt.chunk);
                    for (; i < end; i++) {
                        if (round === 1 && !WH.choT[chars[i]]) {
                            const T = WH.chooseChoForm(chars[i], sp, opt);
                            if (T) WH.choT[chars[i]] = T;
                        }
                        const r = WH.checkSyllable(chars[i], sp, opt);
                        if (r.skipped) { if (round === 1) report.skipped++; continue; }
                        if (round === 1) report.checked++;
                        if (r.issues.length) {
                            failing.push(r);
                            if (round < opt.maxRounds) applyFix(r.ch, r.issues, opt.maxShift);
                        }
                    }
                    if (opt.onProgress) opt.onProgress({ round, done: i, total: chars.length, failing: failing.length });
                    if (i < chars.length) return setTimeout(step, 0);
                    report.rounds.push({ round, failing: failing.length });
                    report.failing = failing;
                    if (failing.length === 0 || failing.length >= prevFail || round >= opt.maxRounds) return resolve(report);
                    prevFail = failing.length;
                    setTimeout(runRound, 0);
                };
                step();
            };
            runRound();
        });
    };

    WH.allSyllables = function () {
        const a = [];
        for (let c = 0xAC00; c <= 0xD7A3; c++) a.push(String.fromCharCode(c));
        return a;
    };

    /**
     * 실시간 연동 루프: 수집기가 창고 파일을 저장(→ build_centerlines.js --watch 가 재생성)하면
     * 일정 주기로 warehouse_centerlines.js 를 다시 읽어 변경 시 onChange 호출 (http 로 열었을 때만 동작).
     */
    WH.startLiveSync = function (url, onChange, intervalMs) {
        if (typeof fetch !== 'function' || !/^https?:$/.test(root.location && root.location.protocol)) return null;
        let busy = false;
        return setInterval(async () => {
            if (busy) return;
            busy = true;
            try {
                const txt = await (await fetch(url + '?t=' + Date.now(), { cache: 'no-store' })).text();
                const m = txt.match(/window\.HANGUL_WH_CENTERLINES\s*=\s*([\s\S]*?);\s*$/);
                if (m) {
                    const d = JSON.parse(m[1]);
                    const fp = JSON.stringify(d.parts).length + ':' + (d.updatedAt || '');
                    if (fp !== WH._fp) { WH.load(d); WH.offsets = {}; WH.choT = {}; onChange && onChange(d); }
                }
            } catch (e) { /* 다음 주기에 재시도 */ }
            busy = false;
        }, intervalMs || 2000);
    };

    if (root.HANGUL_WH_CENTERLINES) WH.load(root.HANGUL_WH_CENTERLINES);
    root.WH = WH;
})(typeof window !== 'undefined' ? window : globalThis);
