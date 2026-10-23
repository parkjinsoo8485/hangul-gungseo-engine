const fs = require('fs');

const WAREHOUSE_JSON = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.json';
const WAREHOUSE_JS = 'C:/project/app_clone/auto_income/hangul_150_parts_warehouse.js';

let data = JSON.parse(fs.readFileSync(WAREHOUSE_JSON, 'utf8'));

// 1. Jung_T2_ㅏ (받침있는 글자의 ㅏ: '한', '각', '간', '달' 등)
// 1획 세로기둥(x=704~711, y=435~879)에서 2획 가로돌기가 확실하게 연결되도록 교정
if (data.parts['Jung_T2_ㅏ']) {
    data.parts['Jung_T2_ㅏ'].medians = [
        [[670, 879], [708, 650], [704, 435]],
        [[704, 650], [784, 652], [864, 650]] // 세로선(704)에서 오른쪽 끝(864)까지 완전 연결!
    ];
    data.parts['Jung_T2_ㅏ'].strokeWidths = [32, 28];
    console.log('Fixed Jung_T2_ㅏ medians');
}

// 2. Jung_T1_ㅐ (받침없는 ㅐ: '개', '배', '해')
// 2획 중간 연결 가로획이 좌우 세로기둥을 완벽 연결하도록 교정
if (data.parts['Jung_T1_ㅐ']) {
    data.parts['Jung_T1_ㅐ'].medians = [
        [[645, 840], [648, 535], [652, 220]],
        [[648, 535], [764, 532], [880, 528]], // 좌측 세로(648) -> 우측 세로(880) 연결!
        [[885, 850], [885, 526], [880, 184]]
    ];
    data.parts['Jung_T1_ㅐ'].strokeWidths = [32, 26, 32];
    console.log('Fixed Jung_T1_ㅐ medians');
}

// 3. Jung_T2_ㅒ (받침있는 ㅒ)
if (data.parts['Jung_T2_ㅒ']) {
    data.parts['Jung_T2_ㅒ'].medians = [
        [[660, 840], [665, 640], [670, 460]],
        [[665, 730], [750, 725], [840, 720]], // 상단 연결
        [[668, 580], [750, 575], [840, 570]], // 하단 연결
        [[848, 860], [848, 636], [842, 440]]
    ];
    data.parts['Jung_T2_ㅒ'].strokeWidths = [30, 24, 24, 30];
    console.log('Fixed Jung_T2_ㅒ medians');
}

// 4. Jung_T2_ㅔ (받침있는 ㅔ)
if (data.parts['Jung_T2_ㅔ']) {
    data.parts['Jung_T2_ㅔ'].medians = [
        [[605, 680], [678, 675], [745, 670]], // 좌측 돌기 -> 첫 세로선 연결!
        [[748, 850], [752, 650], [745, 480]],
        [[838, 880], [840, 650], [835, 430]]
    ];
    data.parts['Jung_T2_ㅔ'].strokeWidths = [26, 30, 30];
    console.log('Fixed Jung_T2_ㅔ medians');
}

// 5. Cho_T1_ㅉ (세로모음용 ㅉ)
if (data.parts['Cho_T1_ㅉ']) {
    data.parts['Cho_T1_ㅉ'].medians = [
        [[120, 595], [210, 598], [270, 595]],
        [[210, 595], [180, 520], [105, 445]],
        [[210, 540], [250, 485], [285, 445]], // 우하향 파임 복원!
        [[310, 600], [390, 605], [455, 602]],
        [[390, 600], [360, 520], [295, 440]],
        [[390, 545], [430, 485], [465, 440]]  // 우하향 파임 복원!
    ];
    data.parts['Cho_T1_ㅉ'].strokeWidths = [28, 28, 28, 28, 28, 28];
    console.log('Fixed Cho_T1_ㅉ medians');
}

// 6. Jong_T2_ㄹ (가로모음/복합모음 받침 ㄹ: '글', '늘', '돌', '물' 등)
// 3획(ㄴ 획) 시작점을 좌측 세로선 위치(x=390, y=210)로 정확히 배치하여 정통 획순 및 배지 겹침 해결!
if (data.parts['Jong_T2_ㄹ']) {
    data.parts['Jong_T2_ㄹ'].medians = [
        [[380, 305], [510, 300], [615, 297], [595, 220]], // 1획: ㄱ
        [[385, 215], [510, 215], [625, 220]],               // 2획: ㅡ
        [[390, 210], [405, 160], [410, 115], [520, 110], [635, 120]] // 3획: ㄴ (왼쪽 세로 -> 바닥 가로)
    ];
    data.parts['Jong_T2_ㄹ'].strokeWidths = [30, 28, 30];
    console.log('Fixed Jong_T2_ㄹ medians');
}

// 7. Jong_T1_ㄹ (세로모음 받침 ㄹ: '달', '말', '팔' 등)
if (data.parts['Jong_T1_ㄹ']) {
    data.parts['Jong_T1_ㄹ'].medians = [
        [[340, 381], [500, 374], [640, 380], [631, 290]],
        [[345, 262], [510, 263], [660, 275]],
        [[350, 260], [370, 210], [375, 150], [510, 135], [670, 150]] // 3획 시작점을 좌측 세로선에 맞춤
    ];
    data.parts['Jong_T1_ㄹ'].strokeWidths = [32, 30, 32];
    console.log('Fixed Jong_T1_ㄹ medians');
}

// 파일 저장
fs.writeFileSync(WAREHOUSE_JSON, JSON.stringify(data, null, 2));
const jsContent = 'window.HANGUL_150_WAREHOUSE = ' + JSON.stringify(data, null, 2) + ';\n';
fs.writeFileSync(WAREHOUSE_JS, jsContent);
console.log('Successfully saved updated warehouse json & js files!');
