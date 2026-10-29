const fs = require('fs');
let code = fs.readFileSync('warehouse_centerlines.js', 'utf8');

// Patch Jung_T1_ㅙ
const t1WaeOld = `"Jung_T1_ㅙ": {
      "c": "ㅙ",
      "r": "jung",
      "t": 1,
      "b": [
        160,
        100,
        780,
        820
      ],
      "m": [
        [
          [
            420,
            575
          ],
          [
            425,
            480
          ],
          [
            430,
            390
          ]
        ],
        [
          [
            211,
            380
          ],
          [
            430,
            390
          ],
          [
            614,
            395
          ]
        ],
        [
          [
            665,
            825
          ],
          [
            670,
            520
          ],
          [
            668,
            220
          ]
        ],
        [
          [
            670,
            520
          ],
          [
            745,
            525
          ],
          [
            820,
            520
          ]
        ],
        [
          [
            815,
            857
          ],
          [
            820,
            510
          ],
          [
            825,
            164
          ]
        ]
      ]`;

const t1WaeNew = `"Jung_T1_ㅙ": {
      "c": "ㅙ",
      "r": "jung",
      "t": 1,
      "b": [
        160,
        100,
        780,
        820
      ],
      "m": [
        [
          [
            420,
            575
          ],
          [
            425,
            480
          ],
          [
            430,
            390
          ]
        ],
        [
          [
            211,
            380
          ],
          [
            430,
            390
          ],
          [
            614,
            395
          ]
        ],
        [
          [
            540,
            825
          ],
          [
            540,
            520
          ],
          [
            540,
            220
          ]
        ],
        [
          [
            540,
            520
          ],
          [
            610,
            520
          ],
          [
            680,
            520
          ]
        ],
        [
          [
            680,
            857
          ],
          [
            680,
            510
          ],
          [
            680,
            164
          ]
        ]
      ]`;

// Patch Jung_T2_ㅙ
const t2WaeOld = `"Jung_T2_ㅙ": {
      "c": "ㅙ",
      "r": "jung",
      "t": 2,
      "b": [
        160,
        380,
        780,
        540
      ],
      "m": [
        [
          [
            425,
            640
          ],
          [
            432,
            572
          ],
          [
            438,
            505
          ]
        ],
        [
          [
            220,
            500
          ],
          [
            435,
            505
          ],
          [
            605,
            508
          ]
        ],
        [
          [
            645,
            850
          ],
          [
            650,
            645
          ],
          [
            650,
            435
          ]
        ],
        [
          [
            650,
            620
          ],
          [
            700,
            622
          ],
          [
            750,
            620
          ]
        ],
        [
          [
            745,
            875
          ],
          [
            750,
            650
          ],
          [
            750,
            425
          ]
        ]
      ]`;

const t2WaeNew = `"Jung_T2_ㅙ": {
      "c": "ㅙ",
      "r": "jung",
      "t": 2,
      "b": [
        160,
        380,
        780,
        540
      ],
      "m": [
        [
          [
            425,
            640
          ],
          [
            432,
            572
          ],
          [
            438,
            505
          ]
        ],
        [
          [
            220,
            500
          ],
          [
            435,
            505
          ],
          [
            605,
            508
          ]
        ],
        [
          [
            535,
            850
          ],
          [
            535,
            645
          ],
          [
            535,
            435
          ]
        ],
        [
          [
            535,
            620
          ],
          [
            605,
            620
          ],
          [
            675,
            620
          ]
        ],
        [
          [
            675,
            875
          ],
          [
            675,
            650
          ],
          [
            675,
            425
          ]
        ]
      ]`;

// Patch Jung_T1_ㅞ
const t1WeOld = `"Jung_T1_ㅞ": {
      "c": "ㅞ",
      "r": "jung",
      "t": 1,
      "b": [
        160,
        100,
        780,
        820
      ],
      "m": [
        [
          [
            220,
            495
          ],
          [
            400,
            498
          ],
          [
            577,
            505
          ]
        ],
        [
          [
            410,
            492
          ],
          [
            402,
            370
          ],
          [
            395,
            250
          ]
        ],
        [
          [
            540,
            420
          ],
          [
            612,
            420
          ],
          [
            685,
            420
          ]
        ],
        [
          [
            685,
            810
          ],
          [
            685,
            510
          ],
          [
            690,
            210
          ]
        ],
        [
          [
            810,
            845
          ],
          [
            810,
            505
          ],
          [
            815,
            164
          ]
        ]
      ]`;

const t1WeNew = `"Jung_T1_ㅞ": {
      "c": "ㅞ",
      "r": "jung",
      "t": 1,
      "b": [
        160,
        100,
        780,
        820
      ],
      "m": [
        [
          [
            220,
            495
          ],
          [
            400,
            498
          ],
          [
            577,
            505
          ]
        ],
        [
          [
            445,
            492
          ],
          [
            435,
            370
          ],
          [
            425,
            250
          ]
        ],
        [
          [
            435,
            420
          ],
          [
            490,
            420
          ],
          [
            550,
            420
          ]
        ],
        [
          [
            550,
            810
          ],
          [
            550,
            510
          ],
          [
            555,
            210
          ]
        ],
        [
          [
            680,
            845
          ],
          [
            680,
            505
          ],
          [
            685,
            164
          ]
        ]
      ]`;

// Patch Jung_T2_ㅞ
const t2WeOld = `"Jung_T2_ㅞ": {
      "c": "ㅞ",
      "r": "jung",
      "t": 2,
      "b": [
        160,
        380,
        780,
        540
      ],
      "m": [
        [
          [
            225,
            575
          ],
          [
            390,
            580
          ],
          [
            555,
            585
          ]
        ],
        [
          [
            390,
            572
          ],
          [
            390,
            495
          ],
          [
            390,
            420
          ]
        ],
        [
          [
            510,
            515
          ],
          [
            580,
            515
          ],
          [
            650,
            515
          ]
        ],
        [
          [
            645,
            845
          ],
          [
            650,
            635
          ],
          [
            650,
            425
          ]
        ],
        [
          [
            745,
            880
          ],
          [
            750,
            650
          ],
          [
            750,
            415
          ]
        ]
      ]`;

const t2WeNew = `"Jung_T2_ㅞ": {
      "c": "ㅞ",
      "r": "jung",
      "t": 2,
      "b": [
        160,
        380,
        780,
        540
      ],
      "m": [
        [
          [
            225,
            575
          ],
          [
            390,
            580
          ],
          [
            555,
            585
          ]
        ],
        [
          [
            440,
            572
          ],
          [
            435,
            495
          ],
          [
            430,
            420
          ]
        ],
        [
          [
            435,
            515
          ],
          [
            490,
            515
          ],
          [
            545,
            515
          ]
        ],
        [
          [
            545,
            845
          ],
          [
            545,
            635
          ],
          [
            545,
            425
          ]
        ],
        [
          [
            675,
            880
          ],
          [
            675,
            650
          ],
          [
            675,
            415
          ]
        ]
      ]`;

const crlf = code.includes('\r\n');
const norm = s => s.replace(/\r\n/g, '\n');

let cNorm = norm(code);
if (!cNorm.includes(norm(t1WaeOld))) console.error('t1WaeOld not found');
else cNorm = cNorm.replace(norm(t1WaeOld), norm(t1WaeNew));

if (!cNorm.includes(norm(t2WaeOld))) console.error('t2WaeOld not found');
else cNorm = cNorm.replace(norm(t2WaeOld), norm(t2WaeNew));

if (!cNorm.includes(norm(t1WeOld))) console.error('t1WeOld not found');
else cNorm = cNorm.replace(norm(t1WeOld), norm(t1WeNew));

if (!cNorm.includes(norm(t2WeOld))) console.error('t2WeOld not found');
else cNorm = cNorm.replace(norm(t2WeOld), norm(t2WeNew));

fs.writeFileSync('warehouse_centerlines.js', crlf ? cNorm.replace(/\n/g, '\r\n') : cNorm);
console.log('Successfully patched warehouse_centerlines.js');
