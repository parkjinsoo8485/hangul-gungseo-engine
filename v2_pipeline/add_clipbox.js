const fs = require('fs');

// Let's add per-stroke clipBounds to '다' in hangul_stroke_dataset.json
const dataset = JSON.parse(fs.readFileSync('C:/한글획순/v2_pipeline/hangul_stroke_dataset.json', 'utf8'));

// '다' strokes clip boundaries (in font coordinates)
// Stroke 0 (상단 가로): strictly Y >= 505 (cannot bleed into vertical stem below)
dataset['다'].strokes[0].clipBox = { x: 100, y: 505, w: 450, h: 150 };

// Stroke 1 (ㄴ형태): strictly Y <= 520 and X <= 675 (cannot bleed into top bar or vertical vowel)
dataset['다'].strokes[1].clipBox = { x: 100, y: 120, w: 575, h: 400 };

// Stroke 2 (모음 세로기둥): strictly X >= 670
dataset['다'].strokes[2].clipBox = { x: 670, y: -150, w: 180, h: 1050 };

// Stroke 3 (모음 곁줄기): strictly X >= 705 and Y between 300 and 450
dataset['다'].strokes[3].clipBox = { x: 705, y: 300, w: 320, h: 150 };

// Do the same for '가', '나', '라'
// '가'
dataset['가'].strokes[0].clipBox = { x: 40, y: 120, w: 520, h: 550 };
dataset['가'].strokes[1].clipBox = { x: 670, y: -150, w: 180, h: 1050 };
dataset['가'].strokes[2].clipBox = { x: 705, y: 300, w: 320, h: 150 };

// '나'
dataset['나'].strokes[0].clipBox = { x: 100, y: 120, w: 575, h: 550 };
dataset['나'].strokes[1].clipBox = { x: 670, y: -150, w: 180, h: 1050 };
dataset['나'].strokes[2].clipBox = { x: 705, y: 300, w: 320, h: 150 };

// '라'
dataset['라'].strokes[0].clipBox = { x: 120, y: 445, w: 380, h: 200 };
dataset['라'].strokes[1].clipBox = { x: 120, y: 390, w: 380, h: 80 };
dataset['라'].strokes[2].clipBox = { x: 120, y: 120, w: 555, h: 300 };
dataset['라'].strokes[3].clipBox = { x: 670, y: -150, w: 180, h: 1050 };
dataset['라'].strokes[4].clipBox = { x: 705, y: 300, w: 320, h: 150 };

fs.writeFileSync('C:/한글획순/v2_pipeline/hangul_stroke_dataset.json', JSON.stringify(dataset, null, 2), 'utf8');
fs.writeFileSync('C:/한글획순/v2_pipeline/hangul_stroke_dataset.js', 'window.HANGUL_STROKE_DATASET = ' + JSON.stringify(dataset, null, 2) + ';', 'utf8');
console.log('Successfully added clipBox to all strokes in dataset!');
