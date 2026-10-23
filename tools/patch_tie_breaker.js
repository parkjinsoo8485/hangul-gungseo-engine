const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldTieBreaker = `                let nmin = 1e12, fb = 0;
                for (let k = 0; k < K; k++) {
                    if (effN[k] < nmin) { nmin = effN[k]; fb = k; }
                }
                let owner = fb;
                for (let k = 0; k < K; k++) {
                    if (effN[k] <= nmin + 0.16 && effN[k] <= 1.32) { owner = k; break; }
                }
                owners[p] = owner;`;

const newTieBreaker = `                let nmin = 1e12, fb = 0;
                for (let k = 0; k < K; k++) {
                    if (effN[k] < nmin) { nmin = effN[k]; fb = k; }
                }
                owners[p] = fb;`;

const normOld = oldTieBreaker.replace(/\r\n/g, '\n');
const normHtml = html.replace(/\r\n/g, '\n');

if (!normHtml.includes(normOld)) {
    console.error('Could not find oldTieBreaker in index.html!');
    process.exit(1);
}

html = normHtml.replace(normOld, newTieBreaker.replace(/\r\n/g, '\n'));
fs.writeFileSync('index.html', html.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully removed biased tie-breaker!');
