const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Search for presets or input values in index.html
const inputMatch = html.match(/id=["']textInput["'][^>]*value=["']([^"']+)["']/i) ||
                   html.match(/value=["']([^"']+)["'][^>]*id=["']textInput["']/i);
console.log('textInput default value:', inputMatch ? inputMatch[1] : 'not found');

// Find words in buttons or options
const buttonMatches = [...html.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1].trim());
console.log('Button texts:', buttonMatches.filter(t => /[가-힣]/.test(t)));

// Find all 2+ Korean character literals in JS
const jsKorean = [...html.matchAll(/['"`]([\uac00-\ud7af]{2,})['"`]/g)].map(m => m[1]);
console.log('Unique Korean literals in script:', [...new Set(jsKorean)]);
